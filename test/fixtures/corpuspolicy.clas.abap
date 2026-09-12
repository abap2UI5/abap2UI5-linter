CLASS zcl_corpuspolicy DEFINITION PUBLIC.

  "! The app that carries every corpus-policy defect once: a <name> in its
  "! ABAP Doc, but <em>this</em> one is markup and stays.
  PUBLIC SECTION.
    INTERFACES z2ui5_if_app.
    DATA mv_text TYPE string.
    DATA mv_flag TYPE abap_bool.
    DATA mv_state TYPE string.
    DATA mv_dead TYPE string.
    DATA mo_ref TYPE REF TO object.
    DATA: mt_bare TYPE TABLE OF string,
          mt_std  TYPE STANDARD TABLE OF string,
          mt_ok   TYPE STANDARD TABLE OF string WITH EMPTY KEY,
          mt_keyed TYPE TABLE OF string WITH NON-UNIQUE KEY table_line,
          mt_sorted TYPE SORTED TABLE OF string WITH UNIQUE KEY table_line.
    TYPES ty_t_rows TYPE TABLE OF string.
    TYPES ty_t_named TYPE STANDARD TABLE OF string WITH DEFAULT KEY.

  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.


CLASS zcl_corpuspolicy IMPLEMENTATION.

  METHOD z2ui5_if_app~main.

    IF client->check_on_init( ).
      mv_state = `set in ABAP, never bound`.
      mo_ref = NEW zcl_corpuspolicy( ).
      DATA(lv_captured) = client->_bind( mv_text ).
      DATA lv_later TYPE string.
      lv_later = client->_event( `LATER` ).
      DATA(view) = z2ui5_cl_ui5_view_builder=>factory( ).
      view->ele( n = `View` ns = `mvc`
          )->a( n = `xmlns`     v = `sap.m`
          )->a( n = `xmlns:mvc` v = `sap.ui.core.mvc`
          )->ele( `Page`
              )->tag( `Input`
                  )->a( n = `value` v = lv_captured
                  )->a( n = `enabled` b = mv_flag
              )->tag( `Button`
                  )->a( n = `text`
                        v = client->_bind( mv_text )
                  )->a( n = `press` v = client->_event( val = `PICK` t_arg = VALUE #( ( `one` ) ( `two` ) ) )
              )->tag( `Button`
                  )->a( n = `text` v = `later`
                  )->a( n = `press` v = lv_later
          )->end( ).
      client->view_display( view->stringify( ) ).
    ELSEIF client->check_on_navigated( ).
      client->view_display( view->stringify( ) ).
    ENDIF.

    IF client->get_event( ) = `PICK`.
      mv_text = client->get_event_arg( 1 ).
      mv_text = client->get_event_arg( v = 1 ) && client->get_event_arg( 2 ).
    ELSEIF client->get_event( ) = `LATER`.
      mv_text = `later`.
    ENDIF.

  ENDMETHOD.

ENDCLASS.
