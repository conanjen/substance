


// Document
// -------------

s.views.Document = Backbone.View.extend({

  initialize: function (options) {
    _.bindAll(this);
    
    this.authorized   = options.authorized;
    this.published    = options.published;
    this.version      = options.version;
    
    var sections = [];

    function collectSections (node, level) {
      node.get('children').each(function (child) {
        if (child.type.key !== '/type/section') return;
        sections.push({id: child._id, html_id: child.html_id, name: child.get('name'), level: level});
        collectSections(child, level+1);
      });
    }

    collectSections(this.model, 1);

    this.node         = s.views.Node.create({ model: this.model, document: this });
    this.documentLens = new s.views.DocumentLens({ model: {items: sections}, authorized: this.authorized });
    this.settings     = new s.views.DocumentSettings({ model: this.model, authorized: this.authorized });
    this.publish      = new s.views.Publish({ model: this.model, docView: this, authorized: this.authorized });
    this.invite       = new s.views.Invite({ model: this.model, authorized: this.authorized });
    this["export"]    = new s.views.Export({ model: this.model, authorized: this.authorized });
    this.subscribers  = new s.views.Subscribers({ model: this.model, authorized: this.authorized });
    this.versions     = new s.views.Versions({ model: this.model, authorized: this.authorized });
    
    // TODO: Instead listen for a document-changed event
    graph.bind('dirty', _.bind(function() {
      this.updatePublishState();
    }, this));

    this.currentView = null;
    
    _.bindAll(this, 'deselect', 'onKeydown');
    $(document.body).keydown(this.onKeydown);
  },

  render: function () {
    $(this.el).html(s.util.tpl('document', {
      doc: this.model,
      authorized: this.authorized
    }));
    
    $(this.documentLens.render().el).appendTo(this.$('#document'));
    $(this.node.render().el).appendTo(this.$('#document'));
    if (this.authorized && !this.version) { this.edit(); }
    this.$('#document_content').click(this.deselect);

    return this;
  },

  remove: function () {
    $(document.body).unbind('keydown', this.onKeydown);
    this.$('#document_content').unbind('click', this.deselect);
    $(this.el).remove();
    return this;
  },


  // Events
  // ------

  events: {
    'click .toggle-subscription': 'toggleSubscription',
    'click .settings':    'toggleSettings',
    'click .publish':     'togglePublish',
    'click .invite':      'toggleInvite',
    'click .subscribers': 'toggleSubscribers',
    'click .versions':    'toggleVersions',
    'click .export':      'toggleExport'
  },

  // Handlers
  // --------

  toggleSubscription: function (e) {
    if (!this.model.get('subscribed')) {
      subscribeDocument(this.model, _.bind(function (err) {
        this.$('.action.toggle-subscription a').html('Remove Bookmark');
        this.$('.tab.subscribers a').html(this.model.get('subscribers'));
      }, this));
    } else {
      unsubscribeDocument(this.model, _.bind(function (err) {
        this.$('.action.toggle-subscription a').html('Bookmark');
        this.$('.tab.subscribers a').html(this.model.get('subscribers'));
      }, this));
    }
    return false;
  },

  toggleSettings:    function (e) { this.toggleView('settings');    return false; },
  togglePublish:     function (e) { this.toggleView('publish');     return false; },
  toggleSubscribers: function (e) { this.toggleView('subscribers'); return false; },
  toggleVersions:    function (e) { this.toggleView('versions');    return false; },
  toggleInvite:      function (e) { this.toggleView('invite');      return false; },
  toggleExport:      function (e) { this.toggleView('export');      return false; },

  onKeydown: function (e) {
    if (e.keyCode === 27) {
      // Escape key
      this.deselect();
    }
  },


  // Helpers
  // -------

  updatePublishState: function () {
    $('#document_navigation .publish-state')
       .removeClass()
       .addClass("publish-state "+getPublishState(this.model));
  },

  edit: function () {
    this.node.transitionTo('write');
  },

  deselect: function () {
    if (this.node) {
      this.node.deselectNode();
      window.editor.deactivate();
      this.$(':focus').blur();
    }
  },

  resizeShelf: function () {
    var shelfHeight   = this.currentView ? $(this.currentView.el).outerHeight() : 0
    ,   contentMargin = shelfHeight + 100;
    this.$('#document_shelf').css({ height: shelfHeight + 'px' });
    this.$('#document_content').css({ 'margin-top': contentMargin + 'px' });
  },

  closeShelf: function() {
    if (!this.currentView) return;
    this.currentView.unbind('resize', this.resizeShelf);

    // It's important to use detach (not remove) to retain the view's event
    // handlers
    $(this.currentView.el).detach();

    this.currentView = null;
    this.$('.document.tab').removeClass('selected');
    this.resizeShelf();
  },

  toggleView: function (viewname) {
    var view = this[viewname];
    var shelf   = this.$('#document_shelf')
    ,   content = this.$('#document_content');
    
    if (this.currentView && this.currentView === view) return this.closeShelf();
    
    this.$('.document.tab').removeClass('selected');
    $('.document.tab.'+viewname).addClass('selected');
    view.load(_.bind(function (err) {
      view.bind('resize', this.resizeShelf);
      shelf.empty();
      shelf.append(view.el)
      this.currentView = view;
      view.render();
    }, this));
  }
});
