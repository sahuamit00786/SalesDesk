function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function generateEmbedScript({ apiBaseUrl, token }) {
  const t = JSON.stringify(String(token || ''))
  const b = JSON.stringify(String(apiBaseUrl || ''))
  return `(function(){var TOKEN=${t};var API=${b};function q(s,r){return(r||document).querySelector(s)}function e(tag,props){var n=document.createElement(tag);if(props){Object.keys(props).forEach(function(k){if(k==="text")n.textContent=props[k];else if(k==="class")n.className=props[k];else n.setAttribute(k,props[k]);});}return n}
function radiusClass(kind){if(kind==='none')return '0px';if(kind==='sm')return '10px';if(kind==='lg')return '18px';return '14px'}
function injectStyles(schema){var id='fynlo-style-'+TOKEN;if(document.getElementById(id))return;var style=e('style',{id:id});var radius=radiusClass((schema.styling||{}).borderRadius);var primary=(schema.styling||{}).primaryColor||'#3b73f5';var text=(schema.styling||{}).textColor||'#0f1117';var bg=(schema.styling||{}).backgroundColor||'#ffffff';var font=(schema.styling||{}).fontFamily||'Plus Jakarta Sans';var width=Math.max(320,Math.min(1200,Number((schema.styling||{}).formWidth||760)));style.textContent='.fynlo-card{font-family:'+font+',sans-serif;max-width:'+width+'px;margin:0 auto;padding:24px;background:'+bg+';color:'+text+';border:1px solid #e3e7f0;border-radius:20px;box-shadow:0 10px 30px rgba(15,17,23,.08)}.fynlo-title{margin:0;font-size:24px;line-height:1.25;font-weight:700}.fynlo-sub{margin:8px 0 18px;color:#4b5263;font-size:14px}.fynlo-row{margin-bottom:12px}.fynlo-label{display:block;font-size:13px;font-weight:600;margin-bottom:6px}.fynlo-help{display:block;font-size:12px;color:#8b93a8;margin-top:4px}.fynlo-input{width:100%;height:40px;border:1px solid #e3e7f0;border-radius:'+radius+';padding:0 12px;font-size:14px;box-sizing:border-box;background:#fff;color:'+text+'}.fynlo-textarea{width:100%;min-height:92px;border:1px solid #e3e7f0;border-radius:'+radius+';padding:10px 12px;font-size:14px;box-sizing:border-box;background:#fff;color:'+text+'}.fynlo-input:focus,.fynlo-textarea:focus{outline:none;border-color:'+primary+';box-shadow:0 0 0 4px rgba(59,115,245,.2)}.fynlo-btn{height:40px;border:0;border-radius:'+radius+';padding:0 18px;background:'+primary+';color:#fff;font-weight:700;cursor:pointer}.fynlo-btn[disabled]{opacity:.65;cursor:not-allowed}.fynlo-divider{border:0;border-top:1px solid #e3e7f0;margin:14px 0}.fynlo-thankyou{text-align:center;padding:28px 14px}.fynlo-check{height:44px;width:44px;border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;background:'+primary+';color:#fff;font-size:24px;font-weight:700}.fynlo-error{margin-top:10px;color:#d1293d;font-size:12px}';document.head.appendChild(style)}
function submit(form,schema,wrap){var fieldValues={};var fd=new FormData();var btn=q('button[type="submit"]',form);var originalBtnText=btn?btn.textContent:'';var errNode=q('.fynlo-error',form);if(errNode)errNode.remove();if(btn){btn.disabled=true;btn.textContent='Submitting...'}fd.append('_fynlo_hp',q('input[name="_fynlo_hp"]',form).value||'');fd.append('referrerUrl',document.referrer||window.location.href);fd.append('landing_url',window.location.href);var usp=new URLSearchParams(window.location.search);fd.append('utm_source',usp.get('utm_source')||'');fd.append('utm_medium',usp.get('utm_medium')||'');fd.append('utm_campaign',usp.get('utm_campaign')||'');(schema.fields||[]).forEach(function(f){var node=q('[name="'+f.id+'"]',form);if(!node)return;if(f.type==='file'){if(node.files&&node.files[0])fd.append(f.id,node.files[0]);return;}if(f.type==='checkbox'){fieldValues[f.id]=node.checked?'true':''}else{fieldValues[f.id]=node.value||''}});fd.append('fieldValues',JSON.stringify(fieldValues));fetch(API+'/api/public/forms/'+TOKEN+'/submit',{method:'POST',body:fd}).then(function(r){return r.json()}).then(function(res){if(!res||!res.success){var msg='Submission failed';if(res&&Array.isArray(res.errors)&&res.errors[0]&&res.errors[0].message)msg=res.errors[0].message;else if(res&&res.error)msg=String(res.error);var er=e('div',{class:'fynlo-error',text:msg});form.appendChild(er);if(btn){btn.disabled=false;btn.textContent=originalBtnText||'Submit'}return;}if(res.redirectUrl){window.location.href=res.redirectUrl;return;}while(wrap.firstChild)wrap.removeChild(wrap.firstChild);var box=e('div',{class:'fynlo-thankyou'});box.appendChild(e('div',{class:'fynlo-check',text:'✓'}));box.appendChild(e('h3',{text:res.message||'Thank you!'}));wrap.appendChild(box)}).catch(function(){var er=e('div',{class:'fynlo-error',text:'Network error. Please try again.'});form.appendChild(er);if(btn){btn.disabled=false;btn.textContent=originalBtnText||'Submit'}})}
function render(schema){injectStyles(schema);var target=q('#fynlo-form-'+TOKEN)||q('[data-fynlo-form="'+TOKEN+'"]');if(!target)return;while(target.firstChild)target.removeChild(target.firstChild);var wrap=e('div',{class:'fynlo-card'});var form=e('form');if(schema.settings&&schema.settings.formTitle)form.appendChild(e('h3',{class:'fynlo-title',text:schema.settings.formTitle}));if(schema.settings&&schema.settings.formSubtitle)form.appendChild(e('p',{class:'fynlo-sub',text:schema.settings.formSubtitle}));(schema.fields||[]).forEach(function(f){if(f.type==='divider'){form.appendChild(e('hr',{class:'fynlo-divider'}));return;}if(f.type==='heading'){var h=e('h4',{text:f.label||''});h.style.margin='10px 0';h.style.fontSize='18px';form.appendChild(h);return;}if(f.type==='paragraph'){var p=e('p',{text:f.label||''});p.style.margin='8px 0';p.style.color='#4b5263';form.appendChild(p);return;}var row=e('div',{class:'fynlo-row'});if(f.label){row.appendChild(e('label',{class:'fynlo-label',text:f.label}))}var tag=(f.type==='textarea')?'textarea':'input';var input=e(tag,{name:f.id,placeholder:f.placeholder||''});if(tag==='input'){if(f.type==='file'){input.type='file'}else{input.type=f.type==='email'?'email':(f.type==='number'?'number':'text')}input.className='fynlo-input'}else{input.className='fynlo-textarea'}if(f.isRequired)input.required=true;row.appendChild(input);if(f.helpText){row.appendChild(e('small',{class:'fynlo-help',text:f.helpText}))}form.appendChild(row)});form.appendChild(e('input',{type:'text',name:'_fynlo_hp',tabindex:'-1',autocomplete:'off',style:'position:absolute;left:-9999px;opacity:0;height:0;width:0;'}));var btn=e('button',{type:'submit',class:'fynlo-btn',text:(schema.settings&&schema.settings.submitButtonText)||'Submit'});form.appendChild(btn);form.addEventListener('submit',function(ev){ev.preventDefault();submit(form,schema,wrap)});wrap.appendChild(form);target.appendChild(wrap);fetch(API+'/api/public/forms/'+TOKEN+'/view',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({referrerUrl:document.referrer||window.location.href})}).catch(function(){})}
fetch(API+'/api/public/forms/'+TOKEN).then(function(r){return r.json()}).then(function(res){if(!res||!res.success)return;render(res.data)});})();`
}

export function serializePublicForm(form) {
  return {
    id: form.id,
    token: form.publicToken,
    fields: (form.fields || []).map((field) => ({
      id: field.id,
      type: field.type,
      label: escapeHtml(field.label || ''),
      placeholder: escapeHtml(field.placeholder || ''),
      helpText: escapeHtml(field.helpText || ''),
      isRequired: Boolean(field.isRequired),
      width: field.width,
      options: Array.isArray(field.options) ? field.options : [],
    })),
    settings: {
      formTitle: escapeHtml(form.formTitle || ''),
      formSubtitle: escapeHtml(form.formSubtitle || ''),
      submitButtonText: escapeHtml(form.submitButtonText || 'Submit'),
      displayType: form.displayType,
      popupTrigger: form.popupTrigger,
      popupDelay: form.popupDelay,
      popupScrollPct: form.popupScrollPct,
      popupButtonSelector: form.popupButtonSelector || null,
      popupOverlay: Boolean(form.popupOverlay),
      popupPosition: form.popupPosition,
      thankyouType: form.thankyouType,
      thankyouMessage: escapeHtml(form.thankyouMessage || 'Thank you!'),
      thankyouRedirectUrl: form.thankyouRedirectUrl || null,
      recaptchaEnabled: Boolean(form.recaptchaEnabled),
      recaptchaSiteKey: form.recaptchaSiteKey || null,
    },
    styling: {
      primaryColor: form.primaryColor || '#3b73f5',
      textColor: form.textColor || '#0f1117',
      backgroundColor: form.backgroundColor || '#ffffff',
      formWidth: Number(form.formWidth || 760),
      fontFamily: form.fontFamily || 'Plus Jakarta Sans',
      borderRadius: form.borderRadius || 'md',
    },
  }
}
