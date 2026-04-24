/**
 * Garage Door Science — Diagnostic Chat widget
 *
 * Default view: symptom chips (pre-matched to diagnostic-tree aliases).
 * Toggle link reveals a free-text input for descriptions that don't fit
 * a chip. Uses safe DOM builders (createElement + textContent) throughout.
 */
(function () {
  'use strict';

  var CFG = (typeof window.GDS_CHAT_CONFIG === 'object' && window.GDS_CHAT_CONFIG) || {};
  var API_BASE = CFG.apiBase || 'https://garagedoorscience.com/api/v1';
  var BEARER = CFG.bearer || '';

  // Pre-matched symptom list. Each `phrase` is a canonical alias known
  // to match in the server-side diagnostic tree. Update if the tree changes.
  var SYMPTOMS = [
    { key: 'wont_open',            label: "Won't open",              phrase: "won't open" },
    { key: 'wont_close',           label: "Won't close",             phrase: "won't close" },
    { key: 'loud_grinding',        label: 'Grinding noise',          phrase: 'grinding noise' },
    { key: 'banging_noise',        label: 'Loud bang or reverses',   phrase: 'loud bang' },
    { key: 'moves_unevenly',       label: 'Moves unevenly',          phrase: 'moves unevenly' },
    { key: 'opens_partially',      label: 'Opens partway',           phrase: 'opens partially' },
    { key: 'remote_not_working',   label: 'Remote not working',      phrase: 'remote not working' },
    { key: 'unusual_noise',        label: 'Noisy or squeaky',        phrase: 'loud noise' },
    { key: 'weather_seal_damaged', label: 'Weather seal damaged',    phrase: 'weather seal damaged' }
  ];

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
      var hint = results.hint || CFG.hintFallback || 'No exact match — try a different symptom or phrase.';
      container.appendChild(el('div', { class: 'gds-nomatch', text: hint }));
      return;
    }
    if (results.safetyFlag) {
      container.appendChild(el('div', { class: 'safety-banner' },
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

    var chipsContainer = widget.querySelector('.gds-chips');
    var chipsView = widget.querySelector('.gds-chips-view');
    var textView = widget.querySelector('.gds-text-view');
    var input = widget.querySelector('.gds-input');
    var submitBtn = widget.querySelector('.gds-submit');
    var results = widget.querySelector('.gds-results');

    if (!chipsContainer || !results) return;

    function submit(description, activeBtn, originalLabel) {
      activeBtn.disabled = true;
      activeBtn.textContent = CFG.loading || 'Thinking…';
      results.replaceChildren();
      diagnose(description)
        .then(function (data) { render(data, results); })
        .catch(function (err) {
          results.replaceChildren(el('div', { class: 'gds-nomatch', text: CFG.errorMsg || 'Something went wrong. Try again.' }));
          console.error(err);
        })
        .then(function () {
          activeBtn.disabled = false;
          activeBtn.textContent = originalLabel;
        });
    }

    // Build chips
    for (var i = 0; i < SYMPTOMS.length; i++) {
      (function (s) {
        var chip = el('button', { type: 'button', class: 'gds-chip', 'data-key': s.key }, s.label);
        chip.addEventListener('click', function () { submit(s.phrase, chip, s.label); });
        chipsContainer.appendChild(chip);
      })(SYMPTOMS[i]);
    }

    // Toggle between chips and text modes
    var toggles = widget.querySelectorAll('.gds-toggle');
    for (var j = 0; j < toggles.length; j++) {
      (function (toggle) {
        toggle.addEventListener('click', function () {
          var target = toggle.getAttribute('data-gds-target');
          if (chipsView) chipsView.hidden = target !== 'chips';
          if (textView) textView.hidden = target !== 'text';
          results.replaceChildren();
          if (target === 'text' && input) input.focus();
        });
      })(toggles[j]);
    }

    // Text-mode submit
    if (submitBtn && input) {
      var originalLabel = submitBtn.textContent;
      submitBtn.addEventListener('click', function () {
        var desc = (input.value || '').trim();
        if (!desc) return;
        submit(desc, submitBtn, originalLabel);
      });
      input.addEventListener('keydown', function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submitBtn.click();
      });
    }
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
