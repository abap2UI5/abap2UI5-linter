CLASS zcl_ifdispatch DEFINITION PUBLIC.

  PUBLIC SECTION.
    INTERFACES z2ui5_if_app.
    DATA mv_text TYPE string.

  PROTECTED SECTION.
  PRIVATE SECTION.
ENDCLASS.


CLASS zcl_ifdispatch IMPLEMENTATION.

  METHOD z2ui5_if_app~main.

    IF client->check_on_init( ).
      mv_text = `init`.
      client->view_display( build_view( ) ).
    ELSEIF client->check_on_navigated( ).
      client->view_display( build_view( ) ).
    ENDIF.

    " the single-branch dispatcher abaplint's short_case demands for one
    " event, grown by ELSEIF and OR - every one of these is a handler
    IF client->get_event( ) = `SAVE`.
      mv_text = `saved`.
    ELSEIF client->get_event( ) = 'RESET' OR client->get_event( ) = |CLEAR|.
      mv_text = ``.
    ELSEIF `DONE` = client->get_event( ).
      mv_text = `done`.
    ELSEIF client->get_event( ) EQ `GONE`.
      mv_text = `gone`.
    ENDIF.

  ENDMETHOD.

  METHOD build_view.

    DATA(view) = z2ui5_cl_ui5_view_builder=>factory( ).

    view->ele( n = `View` ns = `mvc`
        )->a( n = `xmlns`     v = `sap.m`
        )->a( n = `xmlns:mvc` v = `sap.ui.core.mvc`
        )->ele( `Page`
            )->tag( `Button`
                )->a( n = `text` v = client->_bind( mv_text )
                )->a( n = `press` v = client->_event( `SAVE` )
            )->tag( `Button`
                )->a( n = `text` v = `Reset`
                )->a( n = `press` v = client->_event( `RESET` )
            )->tag( `Button`
                )->a( n = `text` v = `Clear`
                )->a( n = `press` v = client->_event( `CLEAR` )
            )->tag( `Button`
                )->a( n = `text` v = `Done`
                )->a( n = `press` v = client->_event( `DONE` )
            )->tag( `Button`
                )->a( n = `text` v = `Gone`
                )->a( n = `press` v = client->_event( `GONE` )
            )->tag( `Button`
                )->a( n = `text` v = `Dead`
                )->a( n = `press` v = client->_event( `DEAD` )
        )->end( ).

    result = view->stringify( ).

  ENDMETHOD.

ENDCLASS.
