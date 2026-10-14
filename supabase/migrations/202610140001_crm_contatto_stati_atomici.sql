CREATE OR REPLACE FUNCTION public.crm_crea_progetto_con_assegnazioni(
  p_nome text,
  p_descrizione text,
  p_monitora_adesioni boolean
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_progetto_id bigint;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.crm_admins
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Utente non autorizzato.' USING ERRCODE = '42501';
  END IF;

  IF NULLIF(btrim(p_nome), '') IS NULL THEN
    RAISE EXCEPTION 'Il nome del progetto è obbligatorio.'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.crm_progetti (
    nome,
    descrizione,
    attivo,
    monitora_adesioni
  )
  VALUES (
    btrim(p_nome),
    NULLIF(btrim(p_descrizione), ''),
    true,
    COALESCE(p_monitora_adesioni, false)
  )
  RETURNING id INTO v_progetto_id;

  INSERT INTO public.crm_cantina_progetti (progetto_id, cantina_id)
  SELECT v_progetto_id, cantina.id
  FROM public.crm_cantine AS cantina
  WHERE cantina.stato = 'ATTIVO'
  ORDER BY cantina.id;

  RETURN v_progetto_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.crm_salva_contatto_con_stati(
  p_cantina_id bigint,
  p_data_contatto timestamptz,
  p_canale text,
  p_interlocutore text,
  p_sintesi text,
  p_aggiornamento_prodotti boolean,
  p_progetto_id bigint,
  p_attivita_id bigint,
  p_nuova_scadenza timestamptz,
  p_nuova_descrizione text,
  p_stato_presentazione text,
  p_stato_adesione text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_contatto_id bigint;
  v_attivita_cantina_id bigint;
  v_assegnazione_id bigint;
  v_presentazione_corrente text;
  v_adesione_corrente text;
  v_presentazione_nuova text;
  v_progetto_monitora_adesioni boolean;
  v_progetto_attivo boolean;
  v_progetto_concluso_il timestamptz;
  v_cantina_stato text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.crm_admins
    WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Utente non autorizzato.' USING ERRCODE = '42501';
  END IF;

  IF p_data_contatto IS NULL OR NULLIF(btrim(p_canale), '') IS NULL THEN
    RAISE EXCEPTION 'Data e canale del contatto sono obbligatori.'
      USING ERRCODE = '22023';
  END IF;

  IF p_attivita_id IS NOT NULL THEN
    SELECT attivita.cantina_id
    INTO v_attivita_cantina_id
    FROM public.crm_attivita AS attivita
    WHERE attivita.id = p_attivita_id
      AND attivita.completata = false
    FOR UPDATE;

    IF NOT FOUND OR v_attivita_cantina_id IS DISTINCT FROM p_cantina_id THEN
      RAISE EXCEPTION 'Attività non valida per questa cantina.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF (p_nuova_scadenza IS NULL) <>
     (NULLIF(btrim(p_nuova_descrizione), '') IS NULL) THEN
    RAISE EXCEPTION 'Inserire data e descrizione del nuovo richiamo.'
      USING ERRCODE = '22023';
  END IF;

  IF p_progetto_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.crm_progetti
    WHERE id = p_progetto_id
  ) THEN
    RAISE EXCEPTION 'Progetto non trovato.' USING ERRCODE = '23503';
  END IF;

  IF p_stato_presentazione IS NOT NULL AND p_stato_presentazione NOT IN (
    'DA PRESENTARE', 'IN CORSO DI PRESENTAZIONE', 'PRESENTATO'
  ) THEN
    RAISE EXCEPTION 'Stato di presentazione non valido.'
      USING ERRCODE = '22023';
  END IF;

  IF p_stato_adesione IS NOT NULL AND p_stato_adesione NOT IN (
    'DA DEFINIRE', 'ADERITO', 'NON ADERITO'
  ) THEN
    RAISE EXCEPTION 'Stato di adesione non valido.'
      USING ERRCODE = '22023';
  END IF;

  IF p_stato_presentazione IS NOT NULL OR p_stato_adesione IS NOT NULL THEN
    IF p_progetto_id IS NULL THEN
      RAISE EXCEPTION 'Per aggiornare gli stati occorre associare un progetto.'
        USING ERRCODE = '22023';
    END IF;

    SELECT
      assegnazione.id,
      assegnazione.stato_presentazione,
      assegnazione.stato_adesione,
      progetto.monitora_adesioni,
      progetto.attivo,
      progetto.concluso_il,
      cantina.stato
    INTO
      v_assegnazione_id,
      v_presentazione_corrente,
      v_adesione_corrente,
      v_progetto_monitora_adesioni,
      v_progetto_attivo,
      v_progetto_concluso_il,
      v_cantina_stato
    FROM public.crm_cantina_progetti AS assegnazione
    JOIN public.crm_progetti AS progetto
      ON progetto.id = assegnazione.progetto_id
    JOIN public.crm_cantine AS cantina
      ON cantina.id = assegnazione.cantina_id
    WHERE assegnazione.progetto_id = p_progetto_id
      AND assegnazione.cantina_id = p_cantina_id
    FOR UPDATE OF assegnazione;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'La cantina non è assegnata al progetto selezionato.'
        USING ERRCODE = '23514';
    END IF;

    IF v_progetto_attivo IS NOT TRUE
      OR v_progetto_concluso_il IS NOT NULL
      OR v_cantina_stato IS DISTINCT FROM 'ATTIVO' THEN
      RAISE EXCEPTION 'Gli stati sono aggiornabili solo per progetti e cantine attivi.'
        USING ERRCODE = '23514';
    END IF;

    v_presentazione_nuova := COALESCE(
      p_stato_presentazione,
      v_presentazione_corrente
    );

    IF v_presentazione_corrente = 'PRESENTATO'
      AND v_presentazione_nuova IS DISTINCT FROM 'PRESENTATO' THEN
      RAISE EXCEPTION 'Lo stato PRESENTATO non può essere revocato.'
        USING ERRCODE = '23514';
    END IF;

    IF p_stato_adesione IS NOT NULL AND (
      v_progetto_monitora_adesioni IS NOT TRUE
      OR v_presentazione_nuova IS DISTINCT FROM 'PRESENTATO'
    ) THEN
      RAISE EXCEPTION 'L''adesione richiede monitoraggio attivo e presentazione completata.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  INSERT INTO public.crm_contatti (
    cantina_id,
    data_contatto,
    canale,
    interlocutore,
    sintesi,
    aggiornamento_prodotti,
    progetto_id
  )
  VALUES (
    p_cantina_id,
    p_data_contatto,
    btrim(p_canale),
    NULLIF(btrim(p_interlocutore), ''),
    NULLIF(btrim(p_sintesi), ''),
    COALESCE(p_aggiornamento_prodotti, false),
    p_progetto_id
  )
  RETURNING id INTO v_contatto_id;

  IF p_attivita_id IS NOT NULL THEN
    UPDATE public.crm_attivita
    SET completata = true,
        completata_il = now()
    WHERE id = p_attivita_id
      AND cantina_id = p_cantina_id
      AND completata = false;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Impossibile completare attività.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF p_nuova_scadenza IS NOT NULL THEN
    INSERT INTO public.crm_attivita (
      cantina_id,
      descrizione,
      scadenza,
      completata,
      progetto_id
    )
    VALUES (
      p_cantina_id,
      btrim(p_nuova_descrizione),
      p_nuova_scadenza,
      false,
      p_progetto_id
    );
  END IF;

  IF v_assegnazione_id IS NOT NULL AND (
    (p_stato_presentazione IS NOT NULL
      AND p_stato_presentazione IS DISTINCT FROM v_presentazione_corrente)
    OR (p_stato_adesione IS NOT NULL
      AND p_stato_adesione IS DISTINCT FROM v_adesione_corrente)
  ) THEN
    PERFORM public.crm_progetti_v1_update_assignment(
      v_assegnazione_id,
      p_stato_presentazione,
      p_stato_adesione,
      v_contatto_id
    );
  END IF;

  RETURN v_contatto_id;
END;
$function$;

ALTER FUNCTION public.crm_crea_progetto_con_assegnazioni(text, text, boolean)
  OWNER TO postgres;
ALTER FUNCTION public.crm_salva_contatto_con_stati(
  bigint, timestamptz, text, text, text, boolean, bigint,
  bigint, timestamptz, text, text, text
) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.crm_progetti_v1_update_assignment(
  bigint, text, text, bigint
) TO postgres;

REVOKE ALL ON FUNCTION public.crm_crea_progetto_con_assegnazioni(
  text, text, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_crea_progetto_con_assegnazioni(
  text, text, boolean
) TO authenticated;

REVOKE ALL ON FUNCTION public.crm_salva_contatto_con_stati(
  bigint, timestamptz, text, text, text, boolean, bigint,
  bigint, timestamptz, text, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.crm_salva_contatto_con_stati(
  bigint, timestamptz, text, text, text, boolean, bigint,
  bigint, timestamptz, text, text, text
) TO authenticated;

REVOKE ALL ON FUNCTION public.crm_progetti_v1_update_assignment(
  bigint, text, text, bigint
) FROM PUBLIC, anon, authenticated;
REVOKE UPDATE ON TABLE public.crm_cantina_progetti
  FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (stato_presentazione, stato_adesione)
  ON TABLE public.crm_cantina_progetti
  FROM PUBLIC, anon, authenticated;