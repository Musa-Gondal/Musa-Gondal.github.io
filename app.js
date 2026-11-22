'use strict';
document.documentElement.classList.add('js');

const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const perFrame = (fn) => {
  let queued = false;
  let last;
  return (event) => {
    last = event;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; fn(last); });
  };
};

const onceVisible = (elements, fn) => {
  const observer = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    fn(e.target);
    observer.unobserve(e.target);
  }), { threshold: 0.08 });
  elements.forEach((el) => observer.observe(el));
};

const nav = $('.nav');
const paper = $('.paper');
const onScroll = perFrame(() => {
  nav.classList.toggle('scrolled', scrollY > 16);
  if (!still && scrollY < innerHeight) paper.style.transform = `translateY(${scrollY * 0.12}px)`;
});
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const menu = $('.menu');
const links = $('#links');
const setMenu = (open) => {
  links.classList.toggle('open', open);
  menu.setAttribute('aria-expanded', String(open));
};
menu.addEventListener('click', () => setMenu(!links.classList.contains('open')));
links.addEventListener('click', () => setMenu(false));
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && links.classList.contains('open')) {
    setMenu(false);
    menu.focus();
  }
});

onceVisible($$('.reveal'), (el) => el.classList.add('in'));

const runButton = $('#run');
const runStatus = $('#run-status');
const nodes = [...$$('.node')];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let hasRun = false;

async function runGraph() {
  hasRun = true;
  runButton.disabled = true;
  nodes.forEach((n) => n.classList.remove('on', 'done'));
  for (const node of nodes) {
    node.classList.add('on');
    runStatus.textContent = `Running: ${node.textContent}`;
    if (!still) await pause(520);
    node.classList.replace('on', 'done');
  }
  runStatus.textContent = 'Done. Human says: ship it.';
  runButton.textContent = 'Run again';
  runButton.disabled = false;
}
runButton.addEventListener('click', runGraph);

if (!still) {
  setTimeout(() => { if (!hasRun) runGraph(); }, 900);

  onceVisible($$('[data-count]'), (el) => {
    const end = Number(el.dataset.count);
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / 1100));
      el.textContent = (end * (1 - (1 - t) ** 3)).toFixed(1);
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  onceVisible($$('[data-scramble]'), (el) => {
    const text = el.textContent;
    let shown = 0;
    const timer = setInterval(() => {
      shown += 2;
      el.textContent = [...text]
        .map((c, i) => (i < shown || !/[a-z]/i.test(c) ? c : 'xo_/'[(i + shown) % 4]))
        .join('');
      if (shown >= text.length) clearInterval(timer);
    }, 35);
  });

  if (pointer) {
    $$('.card').forEach((card) => card.addEventListener('pointermove', perFrame((e) => {
      const box = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - box.left}px`);
      card.style.setProperty('--my', `${e.clientY - box.top}px`);
    })));

    $$('[data-magnet]').forEach((el) => {
      el.addEventListener('pointermove', perFrame((e) => {
        if (!el.matches(':hover')) return;
        const box = el.getBoundingClientRect();
        const x = (e.clientX - box.left - box.width / 2) * 0.15;
        const y = (e.clientY - box.top - box.height / 2) * 0.25;
        el.style.transform = `translate(${x}px, ${y}px)`;
      }));
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }
}

$('#copy').addEventListener('click', async (e) => {
  const button = e.currentTarget;
  const email = 'musagondal94@gmail.com';
  let copied = false;
  // navigator.clipboard does not exist on plain-HTTP origins such as a tailnet IP.
  try {
    await navigator.clipboard.writeText(email);
    copied = true;
  } catch {
    const field = document.createElement('textarea');
    field.value = email;
    document.body.append(field);
    field.select();
    copied = document.execCommand('copy');
    field.remove();
    button.focus();
  }
  button.textContent = copied ? 'Copied. Talk soon.' : 'Select the address above';
  $('#copy-status').textContent = button.textContent;
  setTimeout(() => { button.textContent = 'Copy email'; }, 2200);
});
