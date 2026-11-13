# Account emails (Brevo + Supabase)

Account emails (confirmation, password reset, address change) are sent as **Wilds Forge**, in the
visitor's language (French or English, stored on the account), with the templates of this folder.

Supabase's built-in mailer only delivers to the project's team and about 2 emails per hour, so a custom
SMTP server is required for visitors to receive their emails. Brevo's free plan sends 300 emails a day.

## 1. Brevo

1. Create a free account on https://www.brevo.com.
2. **Senders, domains & dedicated IPs > Senders > Add a sender**: name `Wilds Forge`, and the email address
   the messages will come from. Validate it with the code Brevo sends.
   With a free address (Gmail, Outlook...) emails work but may land in spam more often; a domain of your own
   (e.g. `noreply@wildsforge.fr`, authenticated in Brevo) gives the best delivery.
3. **SMTP & API > SMTP**: note the **SMTP server**, **port**, **login**, then **Generate a new SMTP key**.
   Keep this key secret: it goes only into Supabase.

## 2. Supabase: SMTP

**Authentication > Emails > SMTP Settings**, enable **Custom SMTP**:

| Field | Value |
| --- | --- |
| Sender email | the sender validated in Brevo |
| Sender name | `Wilds Forge` |
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | the Brevo SMTP login (ends with `@smtp-brevo.com`) |
| Password | the Brevo SMTP key |

Then **Authentication > Rate Limits**: raise **emails sent per hour** (e.g. 100).

## 3. Supabase: templates

**Authentication > Emails > Templates**. For each template, paste the subject and the whole content of the file:

| Template | Subject | File |
| --- | --- | --- |
| Confirm signup | `Wilds Forge · Confirmez votre compte / Confirm your account` | [confirm-signup.html](confirm-signup.html) |
| Reset password | `Wilds Forge · Nouveau mot de passe / New password` | [reset-password.html](reset-password.html) |
| Change email address | `Wilds Forge · Nouvelle adresse e-mail / New email address` | [change-email.html](change-email.html) |
| Magic link | `Wilds Forge · Lien de connexion / Sign-in link` | [magic-link.html](magic-link.html) |

The templates pick the language with `{{ .Data.lang }}` and greet the visitor with `{{ .Data.username }}`,
both saved on the account by the site.
