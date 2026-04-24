/**
 * Garage Door Science — Diagnostic Chat widget
 *
 * Default view: symptom chips (pre-matched to diagnostic-tree aliases).
 * Toggle link reveals a free-text input that uses Haiku LLM fallback
 * on the server so colloquial phrasing ("sounds like a gunshot") still
 * maps to a real symptom.
 *
 * After a matched diagnosis, the widget offers a ZIP lookup that calls
 * /api/v1/routeByZip and renders a partner card (name, phone, schedule
 * link). Turns every successful diagnose into a lead-gen opportunity.
 *
 * Uses safe DOM builders (createElement + textContent) throughout.
 */
(function () {
  'use strict';

  var CFG = (typeof window.GDS_CHAT_CONFIG === 'object' && window.GDS_CHAT_CONFIG) || {};
  var API_BASE = CFG.apiBase || 'https://garagedoorscience.com/api/v1';
  var BEARER = CFG.bearer || '';

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

  function buildHeaders() {
    var headers = { 'Content-Type': 'application/json' };
    if (BEARER) headers['Authorization'] = 'Bearer ' + BEARER;
    return headers;
  }

  function diagnose(description, useLlmFallback) {
    var body = { description: description };
    if (useLlmFallback) body.useLlmFallback = true;
    return fetch(API_BASE + '/diagnose', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw new Error('API error: ' + r.status);
      return r.json();
    });
  }

  function routeByZip(zip, issue, leadHeat) {
    var body = { zipOrLocation: zip, leadHeat: leadHeat || 'warm' };
    if (issue) body.issue = issue;
    return fetch(API_BASE + '/routeByZip', {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body)
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

  function renderPartner(resp, container) {
    if (!resp || !resp.covered) {
      container.replaceChildren(
        el('div', { class: 'gds-nomatch' },
          "We don't have a vetted partner in that ZIP yet. Try a nearby ZIP or city, or call "
        ),
        el('a', { href: 'https://garagedoorscience.com', target: '_blank', rel: 'noopener' }, 'garagedoorscience.com'),
        document.createTextNode(' for the main help line.')
      );
      return;
    }
    var p = resp.partner || {};
    var card = el('div', { class: 'gds-partner' });
    card.appendChild(el('h4', { text: p.displayName || 'Local pro' }));
    if (resp.region) {
      card.appendChild(el('p', { class: 'meta', text: 'Covers: ' + resp.region }));
    }
    if (p.phone) {
      var phoneLink = el('a', { href: 'tel:' + p.phone }, p.phone);
      card.appendChild(el('p', null, el('strong', { text: 'Phone: ' }), phoneLink));
    }
    var ctaHref = p.schedulerUrl || p.url;
    if (ctaHref) {
      card.appendChild(el('a', {
        href: ctaHref,
        class: 'gds-cta',
        target: '_blank',
        rel: 'noopener'
      }, p.schedulerUrl ? 'Schedule →' : 'Visit site →'));
    }
    container.replaceChildren(card);
  }

  function buildZipLookup(issueKey, safetyFlag) {
    var section = el('div', { class: 'gds-partner-lookup' });
    var heading = el('h3', { text: safetyFlag ? 'Get urgent help nearby' : 'Find a local pro' });
    var lede = el('p', {
      class: 'lede',
      text: safetyFlag
        ? 'Enter your ZIP code to reach a pro fast. Do not operate the door in the meantime.'
        : 'Enter your ZIP code to find a trusted pro near you.'
    });
    var form = el('div', { class: 'gds-zip-form' });
    var input = el('input', {
      type: 'text',
      class: 'gds-zip-input',
      placeholder: 'ZIP',
      inputmode: 'numeric',
      pattern: '[0-9]{5}',
      maxlength: '5',
      'aria-label': 'ZIP code'
    });
    var submitBtn = el('button', { type: 'button', class: 'gds-zip-submit' }, 'Find pro');
    var resultBox = el('div', { class: 'gds-partner-result' });

    function submitZip() {
      var zip = (input.value || '').trim();
      if (!/^\d{5}$/.test(zip)) {
        resultBox.replaceChildren(el('div', { class: 'gds-nomatch', text: 'Please enter a 5-digit ZIP code.' }));
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Finding…';
      resultBox.replaceChildren();
      routeByZip(zip, issueKey, safetyFlag ? 'hot' : 'warm')
        .then(function (data) { renderPartner(data, resultBox); })
        .catch(function (err) {
          resultBox.replaceChildren(el('div', { class: 'gds-nomatch', text: 'Something went wrong. Try again.' }));
          console.error(err);
        })
        .then(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Find pro';
        });
    }

    submitBtn.addEventListener('click', submitZip);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitZip();
    });

    form.appendChild(input);
    form.appendChild(submitBtn);
    section.appendChild(heading);
    section.appendChild(lede);
    section.appendChild(form);
    section.appendChild(resultBox);
    return section;
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

    // Partner lookup after any matched diagnosis — converts the successful
    // diagnose call into a routing opportunity.
    var symptomKey = results.symptom && results.symptom.key;
    container.appendChild(buildZipLookup(symptomKey, !!results.safetyFlag));
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

    function submit(description, useLlmFallback, activeBtn, originalLabel) {
      activeBtn.disabled = true;
      activeBtn.textContent = CFG.loading || 'Thinking…';
      results.replaceChildren();
      diagnose(description, useLlmFallback)
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

    // Chip mode — no LLM fallback; the canonical phrase always matches
    for (var i = 0; i < SYMPTOMS.length; i++) {
      (function (s) {
        var chip = el('button', { type: 'button', class: 'gds-chip', 'data-key': s.key }, s.label);
        chip.addEventListener('click', function () { submit(s.phrase, false, chip, s.label); });
        chipsContainer.appendChild(chip);
      })(SYMPTOMS[i]);
    }

    // Toggle between chip mode and text mode
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

    // Text-mode submit — opt into LLM fallback so colloquial phrasing
    // ("sounds like a gunshot") maps to a real symptom.
    if (submitBtn && input) {
      var originalLabel = submitBtn.textContent;
      submitBtn.addEventListener('click', function () {
        var desc = (input.value || '').trim();
        if (!desc) return;
        submit(desc, true, submitBtn, originalLabel);
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
