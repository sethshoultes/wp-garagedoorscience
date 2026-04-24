/**
 * Garage Door Science — Diagnostic Chat widget
 *
 * Uses safe DOM builders (document.createElement + textContent)
 * rather than innerHTML with templated strings, so user-provided
 * content can't inject HTML.
 */
(function () {
  'use strict';

  var CFG = (typeof window.GDS_CHAT_CONFIG === 'object' && window.GDS_CHAT_CONFIG) || {};
  var API_BASE = CFG.apiBase || 'https://garagedoorscience.com/api/v1';
  var BEARER = CFG.bearer || '';

  function el(tag, props) {
    var node = document.createElement(tag);
    if (props) {
      for (var k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
        var v = props[k];
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else node.setAttribute(k, v);
      }
    }
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child == null) continue;
      if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  function diagnose(description) {
    var headers = { 'Content-Type': 'application/json' };
    if (BEARER) headers['Authorization'] = 'Bearer ' + BEARER;
    return fetch(API_BASE + '/diagnose', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ description: description })
    }).then(function (r) {
      if (!r.ok) throw new Error('API error: ' + r.status);
      return r.json();
    });
  }

  function renderIssue(issue, urgency) {
    var unsafe = issue.diyRisk === 'unsafe';
    var heading = el('h3', null, issue.name || 'Issue');
    if (unsafe) heading.appendChild(el('span', { class: 'unsafe', text: 'Call a pro' }));

    var min = issue.costRange && issue.costRange.min;
    var max = issue.costRange && issue.costRange.max;
    var costText = 'Typical cost: $' + min + '–$' + max + ' · Urgency: ' + (urgency || 'routine');
    var meta = el('p', { class: 'meta', text: costText });

    var desc = el('p', { text: issue.description || '' });

    var node = el('div', { class: 'gds-issue' }, heading, meta, desc);
    if (issue.safetyNote) {
      node.appendChild(
        el('div', { class: 'safety' }, el('strong', { text: 'Safety note: ' }), issue.safetyNote)
      );
    }
    return node;
  }

  function render(results, container) {
    container.replaceChildren();
    var issues = results.likelyIssues || [];
    var urgency = results.symptom && results.symptom.urgency;
    if (issues.length === 0) {
      var hint = results.hint || CFG.hintFallback || 'No exact match yet — try describing what you see or hear.';
      container.appendChild(el('div', { class: 'gds-nomatch', text: hint }));
      return;
    }
    if (results.safetyFlag) {
      container.appendChild(el('div', { class: 'safety' },
        el('strong', { text: 'Safety: ' }),
        'This looks like something that needs a pro. Do not attempt to repair stored-energy components (springs, cables) yourself.'
      ));
    }
    for (var i = 0; i < issues.length; i++) {
      container.appendChild(renderIssue(issues[i], urgency));
    }
  }

  function bindWidget(widget) {
    if (widget.dataset.gdsBound === '1') return;
    widget.dataset.gdsBound = '1';

    var input = widget.querySelector('.gds-input');
    var btn = widget.querySelector('.gds-submit');
    var results = widget.querySelector('.gds-results');

    if (!input || !btn || !results) return;

    var originalLabel = btn.textContent;

    btn.addEventListener('click', function () {
      var desc = (input.value || '').trim();
      if (!desc) return;
      btn.disabled = true;
      btn.textContent = CFG.loading || 'Thinking…';
      results.replaceChildren();
      diagnose(desc)
        .then(function (data) { render(data, results); })
        .catch(function (err) {
          results.replaceChildren(el('div', { class: 'gds-nomatch', text: CFG.errorMsg || 'Something went wrong. Try again.' }));
          console.error(err);
        })
        .then(function () {
          btn.disabled = false;
          btn.textContent = originalLabel;
        });
    });

    input.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') btn.click();
    });
  }

  function boot() {
    var widgets = document.querySelectorAll('.gds-widget');
    for (var i = 0; i < widgets.length; i++) bindWidget(widgets[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
