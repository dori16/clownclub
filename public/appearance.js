export function resolvedTheme(choice,systemDark){return choice==='dark'||(choice!=='light'&&systemDark)?'dark':'light';}
export function applyTheme(choice=localStorage.getItem('cc-theme')||'auto'){
  const theme=resolvedTheme(choice,matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme=theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',theme==='dark'?'#16151e':'#f2f0f7');
  document.querySelectorAll('[data-action="theme"]').forEach(b=>{b.textContent=theme==='dark'?'☀':'☾';b.setAttribute('aria-label',theme==='dark'?'Attiva modalità chiara':'Attiva modalità scura');});
}
export function setTheme(choice){localStorage.setItem('cc-theme',choice);applyTheme(choice);}
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>applyTheme());
