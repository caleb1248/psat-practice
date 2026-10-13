// Turns the printable question set in sat.html into a one-question-at-a-time quiz.
// Include at the end of sat.html: <script src="testrun.js"></script>
(function () {
  const LETTERS = ['A', 'B', 'C', 'D', 'E'];

  const style = document.createElement('style');
  style.textContent = `
    .tr-hidden { display: none !important; }
    .tr-bar { position: sticky; top: 0; z-index: 10; display: flex; gap: 12px; align-items: center;
      justify-content: space-between; padding: 10px 16px; background: #1e1e1e; color: #fff;
      font-family: sans-serif; font-size: 15px; }
    button { padding: 6px 14px; cursor: pointer; border:none;border-radius: 8px; }
    .tr-form { margin: 16px 0; padding: 12px; border: 1px solid #ccc; border-radius: 6px; font-family: sans-serif; }
    .tr-form input[type=text] { font-size: 16px; padding: 6px 8px; width: 220px; }
    .tr-form button { margin-left: 8px; padding: 6px 14px; cursor: pointer; }
    .tr-choice { display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 6px; border-radius: 4px; justify-content: start; }
    .tr-choice:hover { background: #f2f2f2; }
    .tr-choice.tr-right { background: #d8f5d8; }
    .tr-choice.tr-wrong { background: #f8d7d7; }
    .tr-letter { font-weight: bold; min-width: 1.5em; }
    .tr-feedback { margin-top: 10px; font-weight: bold; }
    .tr-feedback.ok { color: #1a7f1a; }
    .tr-feedback.bad { color: #b00020; }
    .answer-choices ul { list-style: none !important; padding-left: 0; width: fit-content; margin: 0 auto; }
  `;
  document.head.appendChild(style);

  const pages = Array.from(document.querySelectorAll('.question-info'));
  if (!pages.length) return;

  // Pull the accepted answers out of "Correct Answer: B" / "Correct Answer: 1.8, 9/5".
  function correctAnswers(page) {
    const el = page.querySelector('.correct-answer');
    const text = el ? el.textContent.replace(/Correct Answer:/i, '').trim() : '';
    return text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function toNumber(s) {
    s = s.replace(/\s+/g, '').replace(/−/g, '-');
    if (/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return parseFloat(s);
    const m = s.match(/^([-+]?(?:\d+\.?\d*|\.\d+))\/([-+]?(?:\d+\.?\d*|\.\d+))$/);
    if (m && parseFloat(m[2]) !== 0) return parseFloat(m[1]) / parseFloat(m[2]);
    return NaN;
  }

  function numericMatches(guess, accepted) {
    const g = guess.replace(/\s+/g, '');
    const gv = toNumber(g);
    return accepted.some((a) => {
      if (a.replace(/\s+/g, '') === g) return true;
      const av = toNumber(a);
      return !isNaN(gv) && !isNaN(av) && Math.abs(gv - av) < 1e-9;
    });
  }

  const state = pages.map(() => ({ answered: false, correct: false }));

  pages.forEach((page, qi) => {
    const answers = correctAnswers(page);
    const answerContent = page.querySelector('.answer-content');
    if (answerContent) answerContent.classList.add('tr-hidden');

    const form = document.createElement('form');
    form.className = 'tr-form';
    const feedback = document.createElement('div');
    feedback.className = 'tr-feedback';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.textContent = 'Check';

    const choiceList = page.querySelector('.answer-choices ul');
    const isMC = !!choiceList;
    const choiceLabels = [];

    if (isMC) {
      // Wrap each existing choice in a radio-button label so the rendered math is preserved.
      Array.from(choiceList.children).forEach((li, i) => {
        const label = document.createElement('label');
        label.className = 'tr-choice';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'tr-q' + qi;
        radio.value = LETTERS[i];
        const letter = document.createElement('span');
        letter.className = 'tr-letter';
        letter.textContent = LETTERS[i] + '.';
        const body = document.createElement('div');
        while (li.firstChild) body.appendChild(li.firstChild);
        label.append(radio, letter, body);
        li.appendChild(label);
        choiceLabels.push(label);
      });
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'tr-q' + qi;
      input.placeholder = 'Your answer (e.g. 1.8 or 9/5)';
      input.autocomplete = 'off';
      form.appendChild(input);
    }

    form.appendChild(submit);
    form.appendChild(feedback);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (state[qi].answered) return;
      let correct;
      if (isMC) {
        const picked = form.ownerDocument.querySelector(`input[name="tr-q${qi}"]:checked`);
        if (!picked) {
          feedback.className = 'tr-feedback bad';
          feedback.textContent = 'Pick an answer first.';
          return;
        }
        correct = answers.includes(picked.value);
        choiceLabels.forEach((label, i) => {
          if (answers.includes(LETTERS[i])) label.classList.add('tr-right');
          else if (label.contains(picked)) label.classList.add('tr-wrong');
        });
        page.querySelectorAll(`input[name="tr-q${qi}"]`).forEach((r) => (r.disabled = true));
      } else {
        const input = form.querySelector('input[type=text]');
        if (!input.value.trim()) {
          feedback.className = 'tr-feedback bad';
          feedback.textContent = 'Enter an answer first.';
          return;
        }
        correct = numericMatches(input.value, answers);
        input.disabled = true;
      }

      state[qi] = { answered: true, correct };
      submit.disabled = true;
      feedback.className = 'tr-feedback ' + (correct ? 'ok' : 'bad');
      feedback.textContent = correct
        ? 'Correct!'
        : 'Incorrect. Correct answer: ' + answers.join(', ');
      if (answerContent) answerContent.classList.remove('tr-hidden');
      updateBar();
    });

    // MC: put the form right after the choices; numeric: after the question stem.
    const anchor = page.querySelector('.answer-choices') || page.querySelector('.question');
    anchor.insertAdjacentElement('afterend', form);
  });

  // Navigation bar
  const bar = document.createElement('div');
  bar.className = 'tr-bar';
  const prev = document.createElement('button');
  prev.textContent = '← Prev';
  const next = document.createElement('button');
  next.textContent = 'Next →';
  const pos = document.createElement('span');
  const score = document.createElement('span');
  bar.append(prev, pos, score, next);
  document.body.prepend(bar);

  let current = 0;

  function updateBar() {
    const answered = state.filter((s) => s.answered).length;
    const right = state.filter((s) => s.correct).length;
    pos.textContent = `Question ${current + 1} / ${pages.length}`;
    score.textContent = `Score: ${right} / ${answered}`;
    prev.disabled = current === 0;
    next.disabled = current === pages.length - 1;
  }

  function show(i) {
    current = Math.max(0, Math.min(pages.length - 1, i));
    pages.forEach((p, j) => p.classList.toggle('tr-hidden', j !== current));
    updateBar();
    window.scrollTo(0, 0);
  }

  prev.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    if (e.key === 'ArrowRight') show(current + 1);
    if (e.key === 'ArrowLeft') show(current - 1);
  });

  show(0);
})();
