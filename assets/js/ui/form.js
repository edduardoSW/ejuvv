/**
 * Formulário de contato.
 *
 * O site é estático e não há backend, então o envio monta uma mensagem
 * estruturada e abre o WhatsApp comercial da EJUVV, o mesmo canal já
 * divulgado no rodapé e no botão flutuante.
 */

import { services, site, businessSizes } from '../data/site.js';
import { $ } from '../motion/env.js';

/** Máscara BR, portada literalmente do formulário anterior. */
export function maskPhone(value) {
  const n = value.replace(/\D/g, '').slice(0, 11);
  if (n.length > 6) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length > 2) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return n;
}

function buildMessage(data) {
  const lines = [
    `Olá! Sou ${data.name}${data.company ? ` da ${data.company}` : ''}.`,
    '',
    `Serviço de interesse: ${data.service}`,
    `Porte do negócio: ${data.size}`,
    '',
    'Sobre o projeto:',
    data.message,
    '',
    `E-mail: ${data.email}`,
    `WhatsApp: ${data.phone}`,
  ];
  return lines.join('\n');
}

export function initContactForm() {
  const form = $('#contact-form');
  if (!form) return;

  const serviceSelect = form.querySelector('[name="service"]');
  const sizeSelect = form.querySelector('[name="size"]');
  const phoneInput = form.querySelector('[name="phone"]');
  const successPanel = $('#form-success');

  /* ---------- Popula os selects a partir dos dados ---------- */
  if (serviceSelect && serviceSelect.options.length <= 1) {
    services.forEach(({ slug, title }) => {
      const opt = new Option(title, slug);
      serviceSelect.add(opt);
    });
  }

  if (sizeSelect && sizeSelect.options.length <= 1) {
    businessSizes.forEach((label) => sizeSelect.add(new Option(label, label)));
  }

  /* ---------- Pré-seleciona a solução vinda de /contato?servico=slug ---------- */
  const requested = new URLSearchParams(location.search).get('servico');
  if (requested && serviceSelect) {
    const match = services.find((s) => s.slug === requested);
    if (match) serviceSelect.value = match.slug;
  }

  /* ---------- Máscara de telefone ---------- */
  if (phoneInput) {
    phoneInput.addEventListener('input', () => {
      const start = phoneInput.selectionStart;
      const before = phoneInput.value.length;
      phoneInput.value = maskPhone(phoneInput.value);
      const after = phoneInput.value.length;
      if (start !== null && start < before) {
        phoneInput.setSelectionRange(start + (after - before), start + (after - before));
      }
    });
  }

  /* ---------- Envio ---------- */
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    // Honeypot: bots preenchem o campo escondido.
    if (form.elements.website?.value) return;

    if (!form.reportValidity()) return;

    const fd = new FormData(form);
    const serviceSlug = String(fd.get('service') || '');
    const serviceTitle =
      services.find((s) => s.slug === serviceSlug)?.title || serviceSlug || 'Não informado';

    const text = buildMessage({
      name: String(fd.get('name') || '').trim(),
      company: String(fd.get('company') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      service: serviceTitle,
      size: String(fd.get('size') || 'Não informado'),
      message: String(fd.get('message') || '').trim(),
    });

    const url = `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}`;
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) location.href = url;

    if (successPanel) {
      form.hidden = true;
      successPanel.hidden = false;
      successPanel.querySelector('h3')?.focus?.();
    }
  });

  /* ---------- Voltar ao formulário ---------- */
  $('#form-reset')?.addEventListener('click', () => {
    form.reset();
    form.hidden = false;
    if (successPanel) successPanel.hidden = true;
    form.querySelector('input')?.focus();
  });
}
