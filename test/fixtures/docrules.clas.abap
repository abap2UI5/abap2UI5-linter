CLASS zcl_docrules DEFINITION PUBLIC.

  PUBLIC SECTION.
    INTERFACES z2ui5_if_app.
    DATA mv_text TYPE string.

  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.


CLASS zcl_docrules IMPLEMENTATION.

  METHOD z2ui5_if_app~main.

    IF client->check_on_init( ).
      DATA(view) = z2ui5_cl_ui5_view_builder=>factory( ).
      view->ele( n = `View` ns = `mvc`
          )->a( n = `xmlns`      v = `sap.m`
          )->a( n = `xmlns:mvc`  v = `sap.ui.core.mvc`
          )->a( n = `xmlns:core` v = `sap.ui.core`
          )->a( n = `xmlns:f`    v = `sap.f`
          )->a( n = `xmlns:l`    v = `sap.ui.layout` )->a( n = `xmlns:uxap` v = `sap.uxap`
          )->a( n = `xmlns:app`  v = `http://schemas.sap.com/sapui5/extension/sap.ui.core.CustomData/1`
          )->ele( `Page`
              )->a( n = `class` v = `sapUiSmallMargin demoBox undefinedBox`
              )->a( n = `app:role` v = `main`
              )->tag( n = `HTML` ns = `core`
                  )->a( n = `content` v = `<style>.demoBox \{ padding: 1rem \} .demoBox .inner \{ margin: 0 \}</style>`
              )->tag( `Link`
                  )->a( n = `text` v = `plain http, no target`
                  )->a( n = `href` v = `http://sap.com`
              )->tag( `Link`
                  )->a( n = `text` v = `https, target set`
                  )->a( n = `href` v = `https://sap.com`
                  )->a( n = `target` v = `_blank`
              )->tag( `ObjectHeader`
                  )->a( n = `title` v = `paired href`
                  )->a( n = `introHref` v = `https://sap.com`
                  )->a( n = `titleHref` v = `https://sap.com`
                  )->a( n = `titleTarget` v = `_blank`
              )->tag( `Image`
                  )->a( n = `src` v = `http://upload.wikimedia.org/x.jpg`
              )->tag( `Image`
                  )->a( n = `src` v = `https://upload.wikimedia.org/y.jpg`
                  )->a( n = `class` v = `inner`
              )->tag( `Input`
                  )->a( n = `value` v = client->_bind( mv_text )
                  )->a( n = `class` v = client->_bind( mv_text )
          )->end( ).
      client->view_display( view->stringify( ) ).
    ELSEIF client->check_on_navigated( ).
      client->view_display( view->stringify( ) ).
    ENDIF.

  ENDMETHOD.

ENDCLASS.
