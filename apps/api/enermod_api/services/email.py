"""Transactional e-mail: console (development, tests), Resend, or any SMTP mailbox."""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

import httpx

from enermod_api.config import get_settings

log = logging.getLogger("enermod.email")
OUTBOX: list[dict] = []


class EmailError(Exception):
    pass


_T = {
    "en": {
        "magic_subject": "Your sign-in link for EnerMod Africa",
        "magic_body": "Hello,\n\nClick to sign in to EnerMod Africa (valid for {minutes} minutes):\n{url}\n\nIf you did not request this, ignore this message.",
        "reset_subject": "Reset your EnerMod Africa password",
        "reset_body": "Hello,\n\nSomeone asked to reset the password of the EnerMod Africa account for this address. Click to choose a new password (the link is valid for {minutes} minutes):\n{url}\n\nIf you did not ask for this, ignore this message: your password stays the same.",
        "contrib_subject": "New contribution on EnerMod Africa: {kind}",
        "contrib_body": "A new {kind} contribution is waiting for review.\n\n{summary}\n\nReview it: {url}",
        "thanks_subject": "Thank you for your contribution to EnerMod Africa",
        "thanks_body": "Hello,\n\nWe received your proposal \"{title}\". A curator will review it and it will appear in the observatory once verified.\n\nThe EnerMod Africa team",
    },
    "fr": {
        "magic_subject": "Votre lien de connexion EnerMod Africa",
        "magic_body": "Bonjour,\n\nCliquez pour vous connecter à EnerMod Africa (valable {minutes} minutes) :\n{url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
        "reset_subject": "Réinitialiser votre mot de passe EnerMod Africa",
        "reset_body": "Bonjour,\n\nUne réinitialisation du mot de passe du compte EnerMod Africa lié à cette adresse a été demandée. Cliquez pour choisir un nouveau mot de passe (le lien est valable {minutes} minutes) :\n{url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.",
        "contrib_subject": "Nouvelle contribution sur EnerMod Africa : {kind}",
        "contrib_body": "Une nouvelle contribution ({kind}) attend une relecture.\n\n{summary}\n\nLa relire : {url}",
        "thanks_subject": "Merci pour votre contribution à EnerMod Africa",
        "thanks_body": "Bonjour,\n\nNous avons bien reçu votre proposition « {title} ». Un curateur la vérifiera avant publication dans l'observatoire.\n\nL'équipe EnerMod Africa",
    },
}


def _t(locale: str, key: str, **kw) -> str:
    return _T.get(locale, _T["en"])[key].format(**kw)


def configured() -> str:
    s = get_settings()
    if s.email_provider == "resend":
        return "resend" if s.resend_api_key else ""
    if s.email_provider == "smtp":
        return "smtp" if s.smtp_host and s.smtp_user and s.smtp_password else ""
    return "console"


def available() -> bool:
    kind = configured()
    return kind in ("resend", "smtp") or (kind == "console" and get_settings().debug)


def send(to: str, subject: str, text: str) -> None:
    s = get_settings()
    kind = configured()
    if not kind or (kind == "console" and not s.debug):
        log.error("e-mail not configured (EMAIL_PROVIDER=%s)", s.email_provider)
        raise EmailError("E-mail is not configured on this server")
    if kind == "resend":
        try:
            r = httpx.post("https://api.resend.com/emails", timeout=15, headers={"Authorization": f"Bearer {s.resend_api_key}"},
                           json={"from": s.email_from, "to": [to], "subject": subject, "text": text})
            r.raise_for_status()
        except httpx.HTTPError as e:
            raise EmailError("The e-mail provider refused the message") from e
        return
    if kind == "smtp":
        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"] = s.email_from, to, subject
        msg.set_content(text)
        try:
            smtp = smtplib.SMTP_SSL(s.smtp_host, s.smtp_port, timeout=20) if (s.smtp_port == 465 or s.smtp_tls == "ssl") \
                else smtplib.SMTP(s.smtp_host, s.smtp_port, timeout=20)
            with smtp:
                if s.smtp_starttls and not isinstance(smtp, smtplib.SMTP_SSL):
                    smtp.starttls()
                smtp.login(s.smtp_user, s.smtp_password)
                smtp.send_message(msg)
        except (smtplib.SMTPException, OSError) as e:
            raise EmailError(f"The e-mail could not be sent ({type(e).__name__})") from e
        return
    OUTBOX.append({"to": to, "subject": subject, "text": text})
    del OUTBOX[:-50]
    log.info("EMAIL to=%s subject=%s\n%s", to, subject, text)


def send_magic_link(to: str, url: str, locale: str = "en") -> None:
    send(to, _t(locale, "magic_subject"), _t(locale, "magic_body", url=url, minutes=get_settings().magic_link_minutes))


def send_password_reset(to: str, url: str, locale: str = "en") -> None:
    send(to, _t(locale, "reset_subject"), _t(locale, "reset_body", url=url, minutes=get_settings().magic_link_minutes))


def notify_contribution(kind: str, summary: str, url: str) -> None:
    """Best effort: curators' inbox, never fails the request."""
    s = get_settings()
    if not s.notify_email:
        return
    try:
        send(s.notify_email, _t("en", "contrib_subject", kind=kind), _t("en", "contrib_body", kind=kind, summary=summary, url=url))
    except EmailError:
        pass


def thank_submitter(to: str, title: str, locale: str = "en") -> None:
    if not to:
        return
    try:
        send(to, _t(locale, "thanks_subject"), _t(locale, "thanks_body", title=title))
    except EmailError:
        pass
