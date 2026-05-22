# Supabase Setup Notes

## Apply Schema

```bash
supabase db push
```

## Deploy Functions

```bash
supabase functions deploy paystack-webhook
supabase functions deploy release-escrow
```

## Required Secrets

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
supabase secrets set PAYSTACK_SECRET_KEY=<paystack-secret>
supabase secrets set PAYSTACK_WEBHOOK_SECRET=<paystack-webhook-secret>
```

## Webhook URL

Set in Paystack dashboard:

```text
https://<project-ref>.functions.supabase.co/paystack-webhook
```
