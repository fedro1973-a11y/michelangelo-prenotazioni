DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_trigger AS trigger_info
    JOIN pg_catalog.pg_class AS table_info
      ON table_info.oid = trigger_info.tgrelid
    JOIN pg_catalog.pg_namespace AS table_schema
      ON table_schema.oid = table_info.relnamespace
    WHERE table_schema.nspname = 'public'
      AND table_info.relname = 'crm_progetti'
      AND trigger_info.tgisinternal IS FALSE
      AND (trigger_info.tgtype & 4) = 4
      AND (trigger_info.tgtype & 2) = 0
      AND trigger_info.tgenabled IN ('O', 'A')
      AND pg_catalog.pg_get_functiondef(trigger_info.tgfoid)
        ILIKE '%crm_cantina_progetti%'
  ) THEN
    RAISE EXCEPTION
      'Trigger AFTER INSERT che assegna le cantine non trovato su public.crm_progetti; migration annullata.';
  END IF;
END;
$migration$;

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

  RETURN v_progetto_id;
END;
$function$;