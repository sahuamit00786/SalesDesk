/* ============ BRAND ICONS ============ */
var I={
  react:'<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="2.1" fill="#61DAFB"/><g stroke="#61DAFB" stroke-width="1.2"><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/></g></svg>',
  node:'<svg viewBox="0 0 24 24"><path d="M12 1.6 21 6.8v10.4L12 22.4 3 17.2V6.8z" fill="#539E43"/><path d="M12 4.4v15.2l6.6-3.8V8.2z" fill="#3E7A32"/></svg>',
  mongo:'<svg viewBox="0 0 24 24"><path d="M12 2c3.6 4.2 5 7.4 5 10.4 0 4-2.4 6.8-4.6 8l-.4 1.6-.4-1.6C9.4 19.2 7 16.4 7 12.4 7 9.4 8.4 6.2 12 2z" fill="#4DB33D"/></svg>',
  postgres:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#336791"/><text x="12" y="16.2" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="11" fill="#fff">Pg</text></svg>',
  mysql:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#00758F"/><path d="M6 16c1.5-5 4-7.5 6-7.5 1.6 0 2 1.2 3.4 1.2.9 0 1.6-.4 2.6-1.4-1 3-2.4 4.2-4 4.2-1.4 0-2-.9-3.2-.9-1.6 0-3 1.6-4.8 4.4z" fill="#F29111"/></svg>',
  next:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff"/><path d="M8.5 7.5h1.8l5.6 8.6V7.5h1.6v10.4L9 8v8.5H8.5z" fill="#111"/></svg>',
  express:'<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#3A3A44"/><text x="12" y="16" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="10" fill="#FFD747">ex</text></svg>',
  shopify:'<svg viewBox="0 0 24 24"><path d="M16.5 5.6 19 21l-11.6 2L4 6.5l3.4-1c.6-1.7 1.8-3.4 3.4-3.4.9 0 1.5.5 1.9 1.1.3-.1.6-.2.8-.2 1.5 0 2.5 1.2 3 2.6z" fill="#95BF47"/></svg>',
  wordpress:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#21759B"/><path d="M4.5 9h3.2l2.4 7.4L12 11l-1-2h3.6l2.5 7.6 1.5-4.6c.7-2.2-.4-3-.4-3H19c1.1 1.9.4 4-.2 5.7L16.6 21 13 12.4 9.7 21 5.6 11c-.4-1-1.1-2-1.1-2z" fill="#fff"/></svg>',
  openai:'<svg viewBox="0 0 24 24" fill="none" stroke="#10A37F" stroke-width="1.5"><circle cx="12" cy="12" r="2.4"/><path d="M12 3a4.4 4.4 0 0 1 4.2 3M12 3a4.4 4.4 0 0 0-4.2 3M12 3v4.5M19.2 7.5a4.4 4.4 0 0 1-.6 5.3M19.2 7.5a4.4 4.4 0 0 0-3-1.5M16 18a4.4 4.4 0 0 1-5.2 1.4M16 18a4.4 4.4 0 0 0 2.6-2.2M8 18a4.4 4.4 0 0 1-3.2-7M8 18c.9 1 2.4 1.6 4 1.4M4.8 7.6A4.4 4.4 0 0 1 9.6 5.4"/></svg>',
  claude:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#D97757"/><path d="M12 5l1.7 4.6L18 11l-4.3 1.4L12 17l-1.7-4.6L6 11l4.3-1.4z" fill="#fff"/></svg>',
  huggingface:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#FFD21E"/><circle cx="8.5" cy="10" r="1.3" fill="#5B3A1E"/><circle cx="15.5" cy="10" r="1.3" fill="#5B3A1E"/><path d="M8 14c1.2 1.6 2.5 2.4 4 2.4s2.8-.8 4-2.4" stroke="#5B3A1E" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>',
  n8n:'<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#FF6D5A"/><text x="12" y="15.8" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="8.5" fill="#fff">n8n</text></svg>',
  make:'<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#8B5CF6"/><text x="12" y="15.6" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="8" fill="#fff">make</text></svg>',
  docker:'<svg viewBox="0 0 24 24"><g fill="#2496ED"><rect x="3" y="11" width="3" height="3" rx=".5"/><rect x="7" y="11" width="3" height="3" rx=".5"/><rect x="11" y="11" width="3" height="3" rx=".5"/><rect x="7" y="7" width="3" height="3" rx=".5"/><rect x="11" y="7" width="3" height="3" rx=".5"/><rect x="11" y="3" width="3" height="3" rx=".5"/><path d="M2 15h17c2 0 3.4-1 4-2.6-1.2.3-2.4 0-3-.8-.3-1-.1-1.9.5-2.6-1.4-.8-3-.5-3.8.4H2z" opacity=".85"/></g></svg>',
  aws:'<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#3A3F4A"/><text x="12" y="13.4" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="7.5" fill="#fff">aws</text><path d="M5 16.5c4.6 2.6 9.4 2.6 14 0l-1.6 2c-3.6 1.8-7.2 1.8-10.8 0z" fill="#FF9900"/></svg>',
  gcp:'<svg viewBox="0 0 24 24"><path d="M7 17a5 5 0 0 1 .8-9.9A6 6 0 0 1 19 9a4 4 0 0 1-1 7.9z" fill="none" stroke="#4285F4" stroke-width="1.8" stroke-linejoin="round"/><circle cx="9" cy="14" r="1.2" fill="#EA4335"/><circle cx="12.5" cy="14" r="1.2" fill="#FBBC05"/><circle cx="16" cy="14" r="1.2" fill="#34A853"/></svg>',
  azure:'<svg viewBox="0 0 24 24"><path d="M13.6 3 6 17.6l-3 .4L10.4 3z" fill="#0089D6"/><path d="M14.8 6 8.6 21H21z" fill="#0072C6"/></svg>',
  kubernetes:'<svg viewBox="0 0 24 24"><path d="M12 2.4 20.4 7v8.6L12 21.6 3.6 15.6V7z" fill="#326CE5"/><circle cx="12" cy="12" r="3.4" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M12 6.5v2M12 15.5v2M7 9l1.8 1M15.2 14l1.8 1M7 15l1.8-1M15.2 10l1.8-1" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/></svg>',
  firebase:'<svg viewBox="0 0 24 24"><path d="M5 18 7.4 3.8c.1-.5.7-.6 1-.2L11 8.2z" fill="#FFA000"/><path d="M5 18 13.6 4.4c.3-.4.9-.3 1 .2L17 9z" fill="#F57C00" opacity=".85"/><path d="M5 18 16.9 6.5c.3-.3.9-.1.9.4L19 18l-6.6 3.7c-.3.2-.7.2-1 0z" fill="#FFCA28"/></svg>',
  supabase:'<svg viewBox="0 0 24 24"><path d="M13 2v9h7c.6 0 .9.7.5 1.1L11 22v-9H4c-.6 0-.9-.7-.5-1.1z" fill="#3ECF8E"/></svg>',
  prisma:'<svg viewBox="0 0 24 24"><path d="M5 16.5 11.3 3c.3-.6 1.1-.6 1.4 0l6.4 13.8c.2.5 0 1.1-.5 1.3l-6.3 2.8c-.3.1-.6.1-.9 0l-5.9-3c-.5-.2-.7-.9-.5-1.4z" fill="#5A67D8"/><path d="M12.2 6.2 8 16.8l5.6 2.6 2.4-12z" fill="#fff" opacity=".3"/></svg>',
  redis:'<svg viewBox="0 0 24 24"><g fill="#DC382D"><path d="M12 4 21 8l-9 4-9-4z"/><path d="M3 11.5l9 4 9-4v2.5l-9 4-9-4z" opacity=".8"/></g></svg>',
  tailwind:'<svg viewBox="0 0 24 24" fill="#38BDF8"><path d="M12 6c-2.7 0-4.3 1.3-5 4 1-1.3 2.2-1.9 3.5-1.5.8.2 1.3.8 1.9 1.4 1 1 2.1 2.1 4.6 2.1 2.7 0 4.3-1.3 5-4-1 1.3-2.2 1.9-3.5 1.5-.8-.2-1.3-.8-1.9-1.4C15.6 7.1 14.5 6 12 6zM7 12c-2.7 0-4.3 1.3-5 4 1-1.3 2.2-1.9 3.5-1.5.8.2 1.3.8 1.9 1.4 1 1 2.1 2.1 4.6 2.1 2.7 0 4.3-1.3 5-4-1 1.3-2.2 1.9-3.5 1.5-.8-.2-1.3-.8-1.9-1.4C10.6 13.1 9.5 12 7 12z"/></svg>',
  ts:'<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#3178C6"/><text x="12" y="16.4" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="10" fill="#fff">TS</text></svg>',
  js:'<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#F7DF1E"/><text x="12" y="16.4" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="10" fill="#111">JS</text></svg>',
  html5:'<svg viewBox="0 0 24 24"><path d="M4 2h16l-1.5 17L12 22l-6.5-3z" fill="#E44D26"/><path d="M8 7h8l-.2 2H10l.2 2h5.4l-.5 5-3.1 1-3.1-1-.2-2.4h2l.1 1.2 1.2.4 1.2-.4.2-1.8H7.7z" fill="#fff"/></svg>',
  css3:'<svg viewBox="0 0 24 24"><path d="M4 2h16l-1.5 17L12 22l-6.5-3z" fill="#1572B6"/><path d="M8 7h8l-.2 2-.2 2-.3 3-3.3 1.2L8.7 14l-.2-2h2l.1 1 1.4.4 1.4-.5.2-1.9H8.3L8 9h7.6l.2-2z" fill="#fff" opacity=".95"/></svg>',
  vue:'<svg viewBox="0 0 24 24"><path d="M2 4h4.4L12 13.6 17.6 4H22L12 21z" fill="#41B883"/><path d="M6.4 4h3.4L12 8 14.2 4h3.4L12 13.6z" fill="#34495E"/></svg>',
  angular:'<svg viewBox="0 0 24 24"><path d="M12 2 3 5.4l1.4 12L12 22l7.6-4.6 1.4-12z" fill="#DD0031"/><path d="M12 5.5 7 17h2.1l1-2.6h3.8l1 2.6H17zm1.2 7.1h-2.4L12 9.4z" fill="#fff"/></svg>',
  python:'<svg viewBox="0 0 24 24"><path d="M12 2c-2.6 0-4.5.8-4.5 3v2.5H12v1H5.5C3.3 8.5 2 10 2 12s1.3 3.5 3.5 3.5H7V13c0-2 1.7-3.5 3.7-3.5h4.8c1.7 0 3-1.3 3-3V5c0-2.2-1.9-3-4.5-3z" fill="#3776AB"/><path d="M12 22c2.6 0 4.5-.8 4.5-3v-2.5H12v-1h6.5c2.2 0 3.5-1.5 3.5-3.5s-1.3-3.5-3.5-3.5H17V11c0 2-1.7 3.5-3.7 3.5H8.5c-1.7 0-3 1.3-3 3V19c0 2.2 1.9 3 4.5 3z" fill="#FFD43B"/></svg>',
  django:'<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#0C4B33"/><text x="12" y="15.8" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="8.5" fill="#44B78B">dj</text></svg>',
  fastapi:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#009688"/><path d="M13 4 6.5 13H11l-1 7L17 11h-4.5z" fill="#fff"/></svg>',
  nest:'<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#E0234E"/><text x="12" y="16" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="9" fill="#fff">N</text></svg>',
  graphql:'<svg viewBox="0 0 24 24"><g stroke="#E10098" stroke-width="1.3" fill="none"><path d="M12 3 20 7.8v8.4L12 21l-8-4.8V7.8z"/><path d="M12 3 4 16.2h16zM12 21 4 7.8h16"/></g><g fill="#E10098"><circle cx="12" cy="3" r="1.7"/><circle cx="20" cy="7.8" r="1.7"/><circle cx="20" cy="16.2" r="1.7"/><circle cx="12" cy="21" r="1.7"/><circle cx="4" cy="16.2" r="1.7"/><circle cx="4" cy="7.8" r="1.7"/></g></svg>',
  flutter:'<svg viewBox="0 0 24 24"><path d="M13.5 2 4 11.5l3 3z" fill="#44D1FD"/><path d="M13.5 10.8 8.4 16l5.1 5.2H20l-5.2-5.2L20 10.8z" fill="#0468D7"/></svg>',
  expo:'<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#2B2F36"/><path d="M12 6c2.8 3 4.8 6.4 6 10.5.2.7-.6 1.3-1.2.8C14.6 15.5 13 13 12 10.4 11 13 9.4 15.5 7.2 17.3c-.6.5-1.4-.1-1.2-.8C7.2 12.4 9.2 9 12 6z" fill="#fff"/></svg>',
  zapier:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#FF4F00"/><path d="M12 5v4.2L9 6.2 6.2 9 9.2 12H5h4.2L6.2 15 9 17.8l3-3V19v-4.2l3 3L17.8 15l-3-3H19h-4.2l3-3L15 6.2l-3 3V5z" fill="#fff"/></svg>',
  langchain:'<svg viewBox="0 0 24 24" fill="none" stroke="#7BE3B6" stroke-width="2" stroke-linecap="round"><path d="M9 15 6.5 17.5a3.5 3.5 0 0 1-5-5L6 8a3.5 3.5 0 0 1 5.4.6"/><path d="M15 9l2.5-2.5a3.5 3.5 0 0 1 5 5L18 16a3.5 3.5 0 0 1-5.4-.6"/></svg>',
  vercel:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#fff"/><path d="M12 6.5 18 17H6z" fill="#111"/></svg>',
  nginx:'<svg viewBox="0 0 24 24"><path d="M12 2.4 20.4 7.2v9.6L12 21.6 3.6 16.8V7.2z" fill="#009639"/><path d="M8 16V8.4c0-.8 1-1.1 1.5-.5l4.9 5.6V8h1.6v7.6c0 .8-1 1.1-1.5.5L9.6 10.5V16z" fill="#fff"/></svg>',
  github:'<svg viewBox="0 0 24 24"><path d="M12 .5C5.6.5.5 5.6.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.4-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0C17.3 4.9 18.3 5.2 18.3 5.2c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.6.8.5A11.5 11.5 0 0 0 23.5 12C23.5 5.6 18.4.5 12 .5z" fill="#E8E8EC"/></svg>',
  stripe:'<svg viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#635BFF"/><path d="M11 9.3c0-.7.6-1 1.5-1 1.2 0 2.6.4 3.8 1V6.1A9.6 9.6 0 0 0 12.5 5.4c-3 0-5 1.6-5 4.2 0 4 5.5 3.4 5.5 5.1 0 .8-.7 1.1-1.6 1.1-1.3 0-2.9-.5-4.2-1.3v3.3c1.4.6 2.8.9 4.2.9 3 0 5.1-1.5 5.1-4.2 0-4.3-5.5-3.6-5.5-5.2z" fill="#fff"/></svg>'
};
function ic(k,s){return I[k].replace('<svg','<svg width="'+(s||17)+'" height="'+(s||17)+'" aria-hidden="true"');}

/* ============ DATA ============ */
var MARQ=[['react','React'],['node','Node.js'],['python','Python'],['next','Next.js'],['ts','TypeScript'],
  ['mongo','MongoDB'],['postgres','PostgreSQL'],['graphql','GraphQL'],['openai','OpenAI'],['n8n','n8n'],
  ['docker','Docker'],['kubernetes','Kubernetes'],['aws','AWS'],['shopify','Shopify'],['stripe','Stripe'],
  ['firebase','Firebase'],['tailwind','Tailwind'],['wordpress','WordPress']];

var SERVICES=[
  ['code-1','Full Stack Development','Robust web platforms built end-to-end — pixel-perfect frontends on rock-solid backends.'],
  ['component','React & Node.js Applications','High-performance apps on the JavaScript stack trusted by the fastest teams.'],
  ['cpu','AI Automation Solutions','Custom AI agents and pipelines that remove repetitive work from your operations.'],
  ['hierarchy-2','n8n Workflow Automation','Self-hosted, visual workflows that connect every tool your business runs on.'],
  ['shopping-cart','Shopify Development','Conversion-focused storefronts, custom themes, and headless commerce builds.'],
  ['globe','WordPress Development','Fast, secure, fully custom WordPress builds — far beyond the template look.'],
  ['driver-2','Database Architecture','Schemas, indexing, and data models engineered for speed at any scale.'],
  ['link-2','API Integrations','Clean, documented integrations that make your tools talk to each other reliably.'],
  ['layers-1','SaaS Development','Multi-tenant platforms with billing, auth, and analytics — ready for your first 10,000 users.'],
  ['cloud-connection','Cloud Deployments','CI/CD, containers, and infrastructure that deploys in minutes and scales on demand.']
];

var UNIVERSE=[
  ['monitor','Frontend',[['react','React'],['next','Next.js'],['vue','Vue.js'],['angular','Angular'],['js','JavaScript'],['ts','TypeScript'],['tailwind','Tailwind CSS'],['html5','HTML5'],['css3','CSS3']]],
  ['code-2','Backend & APIs',[['node','Node.js'],['express','Express.js'],['nest','NestJS'],['python','Python'],['django','Django'],['fastapi','FastAPI'],['graphql','GraphQL']]],
  ['driver-2','Databases',[['mongo','MongoDB'],['postgres','PostgreSQL'],['mysql','MySQL'],['redis','Redis'],['firebase','Firebase'],['supabase','Supabase'],['prisma','Prisma']]],
  ['mobile','Mobile',[['react','React Native'],['flutter','Flutter'],['expo','Expo']]],
  ['cpu-setting','AI & Automation',[['openai','OpenAI'],['claude','Claude'],['langchain','LangChain'],['huggingface','Hugging Face'],['n8n','n8n'],['zapier','Zapier'],['make','Make']]],
  ['cloud','Cloud & DevOps',[['aws','AWS'],['gcp','Google Cloud'],['azure','Azure'],['docker','Docker'],['kubernetes','Kubernetes'],['vercel','Vercel'],['nginx','Nginx'],['github','GitHub Actions']]],
  ['shop','Commerce & Payments',[['shopify','Shopify'],['wordpress','WordPress'],['stripe','Stripe']]]
];

var PROJECT_SECTIONS=[
  {title:'Full-stack applications',label:'Custom SaaS & platforms',badge:'Full-stack',preview:'iframe',items:[
    {name:'InsurVault',url:'https://murale.insur-vault.com/',desc:'Insurance management — policies, clients, and operations in one secure workspace.',tags:['React','Node.js','MySQL']},
    {name:'Invoicing Software',url:'https://invoice.myycrowsoft.com/',desc:'Desktop invoicing app with billing, PDF export, and client records.',tags:['Electron','React','Node.js']},
    {name:'Law Office Management',url:'https://loms-law.com/',desc:'Case, client, document, and staff workflows for legal practices.',tags:['Electron','React','MySQL']},
    {name:'LeadNest CRM',url:'https://leadnest.upgrowventures.com/',desc:'LeadNest CRM — leads, deals, pipelines, email, and team collaboration.',tags:['React','Node.js','MySQL']},
    {name:'Trading Platform',url:'https://trading.upgrowventures.com/',desc:'Trading operations dashboard built for Upgrow Ventures.',tags:['React','Node.js','API']}
  ]},
  {title:'Shopify, WordPress & web',label:'Storefronts & marketing sites',badge:'Web',preview:'static',items:[
    {name:'Mariners Warehouse',url:'https://marinerswarehouse.com/',desc:'Marine supplies e-commerce storefront.',tags:['Shopify','E-commerce']},
    {name:'Orange Lab Media',url:'https://www.orangelabmedia.com/',desc:'Creative agency marketing website.',tags:['WordPress','Marketing']},
    {name:'Syntheia AI',url:'https://www.syntheia.ai/',desc:'AI product company site and positioning.',tags:['Webflow','SaaS']},
    {name:'Brilliant Solutions',url:'https://discoverbrilliantsolutions.com/',desc:'Business solutions discovery and lead-generation site.',tags:['WordPress']},
    {name:'Media Query',url:'https://mediaquery.ca/',desc:'Digital media and marketing presence.',tags:['WordPress']},
    {name:'You Go Rentals',url:'https://you-gorentals.com/',desc:'Vehicle rental booking and information site.',tags:['WordPress']},
    {name:'Orca Info',url:'http://orcainfo-com.com/',desc:'Marine / rental information portal.',tags:['WordPress']},
    {name:'Print Pandas',url:'https://www.printpandas.com/',desc:'Custom print and merchandise storefront.',tags:['Shopify','Print']},
    {name:'Print Pandas ESP',url:'https://printpandas.espwebsite.com/',desc:'B2B print catalog and distributor portal.',tags:['ESP','B2B']},
    {name:'Reliable Product',url:'https://www.reliableproduct.com/',desc:'Product catalog and company web presence.',tags:['WordPress']},
    {name:'Applewood',url:'https://applewood.co.in/',desc:'Brand website and product showcase.',tags:['WordPress']},
    {name:'Trehi Organics',url:'https://trehiorganics.com/',desc:'Organic products Shopify storefront.',tags:['Shopify']},
    {name:'Anahita Chikankari',url:'https://anahitachikankari.com/',desc:'Artisan fashion e-commerce store.',tags:['Shopify']},
    {name:'Joshis Uvarn Parampara',url:'https://joshisuvarnparampara.com/',desc:'Heritage brand and product storytelling site.',tags:['WordPress']},
    {name:'ICAI Lucknow',url:'https://lucknow.icai.org/',desc:'Regional chartered accountants chapter portal.',tags:['WordPress']},
    {name:'SMA & Associates',url:'https://sma-ca.com/',desc:'Chartered accountancy firm website.',tags:['WordPress']},
    {name:'Attari Furniture',url:'https://attarifurniture.in/',desc:'Furniture catalog and retail web presence.',tags:['WordPress']},
    {name:'Hamilton Temple',url:'https://hamiltontemple.com/',desc:'Community / organization website.',tags:['WordPress']},
    {name:'GPAA',url:'https://gpaa.in/',desc:'Association website and member resources.',tags:['WordPress']},
    {name:'Dakota Steel & Trim',url:'https://www.dakotasteelandtrim.com/',desc:'Steel products and industrial supply site.',tags:['WordPress']},
    {name:'MD Metals & Diamonds',url:'https://mdmetalsdiamonds.com/',desc:'Jewellery and metals e-commerce.',tags:['Shopify']},
    {name:'Mimansha Herbals',url:'https://mimanshaherbals.com/',desc:'Herbal wellness Shopify store.',tags:['Shopify']},
    {name:'Biogen (Webflow)',url:'https://biogen-v1-003971342a502e0f43964e362177b.webflow.io/',desc:'Campaign landing experience on Webflow.',tags:['Webflow']},
    {name:'Navoba',url:'https://www.navoba.org/',desc:'Non-profit organization website.',tags:['WordPress']},
    {name:'American Brothers FL',url:'https://americanbrothersfl.com/',desc:'Bilingual services business website (EN / ES).',tags:['WordPress']},
    {name:'GA Consulting Engineers',url:'https://gaconsultingengineers.com/',desc:'Engineering consultancy firm site.',tags:['WordPress']},
    {name:'TDG Scientific',url:'https://tdgscientific.com/',desc:'Scientific products and services web presence.',tags:['WordPress']},
    {name:'CA Piyush Misra',url:'https://capiyushmisra.com/',desc:'Professional chartered accountant portfolio.',tags:['WordPress']},
    {name:'Aqualina Marbella',url:'https://www.aqualinamarbella.com/',desc:'Luxury property / hospitality marketing site.',tags:['WordPress']},
    {name:'Orca Rental',url:'https://orcarental.com/',desc:'Equipment rental booking website.',tags:['WordPress']},
    {name:'Magik Weaves',url:'https://magikweaves.com/',desc:'Handloom and textiles e-commerce.',tags:['Shopify']}
  ]}
];

var TIMELINE=[
  ['Discovery','We map your goals, users, and constraints before a single line of code.'],
  ['Strategy','A clear technical roadmap — stack, scope, milestones, and budget.'],
  ['Design','Interfaces prototyped and tested until the experience feels inevitable.'],
  ['Development','Senior engineers ship in transparent sprints with weekly demos.'],
  ['Automation','AI and workflow automation woven into operations from day one.'],
  ['Deployment','Zero-downtime launches on hardened, monitored infrastructure.'],
  ['Growth','Analytics, iteration, and scaling support long after launch day.']
];

var TESTIMONIALS=[
  ['Upgrow rebuilt our platform and automated our entire onboarding. What took our team three days now takes eleven minutes.','Sarah Mitchell','COO, Brightline SaaS','#A78BFA'],
  ['The rare agency that ships exactly what was scoped, on the day they said they would. Our Shopify revenue is up 64%.','Daniel Okafor','Founder, Verra Goods','#7BE3B6'],
  ['Their n8n workflows quietly run half our company now. Best engineering investment we have made.','Priya Raman','Head of Ops, Northwind Labs','#8FB7FF'],
  ['From idea to a live SaaS in nine weeks — with billing, auth, and analytics done properly. Remarkable team.','Tomás Herrera','CEO, Quantia','#FFB86B'],
  ['They treat your product like their own. Code quality and documentation are the best we have seen from any partner.','Emily Zhao','CTO, Ferrochain','#F0A6CA'],
  ['Our enterprise CRM migration was flawless. Zero downtime, zero data loss, and a far faster system.','Marcus Webb','VP Engineering, Coreline','#9EE6F2']
];

var PROCESS=[
  ['bulb','Idea','We listen first — your vision, your market, your constraints.'],
  ['task-list','Planning','Scope, architecture, and milestones locked into a clear plan.'],
  ['pen-tool-2','Design','Wireframes to polished UI, validated with real users.'],
  ['code-2','Development','Agile sprints, weekly demos, production-grade code.'],
  ['shield-tick','Testing','Automated and manual QA across devices and edge cases.'],
  ['send-2','Launch','Zero-downtime deployment with monitoring from minute one.'],
  ['trend-up','Scaling','Performance tuning, automation, and growth iterations.']
];

/* ============ RENDER HELPERS ============ */
var PROJ_STACK_THEME={
  Shopify:{accent:'#95BF47',glow:'rgba(149,191,71,.2)',bg:'#1a1f14'},
  WordPress:{accent:'#21759B',glow:'rgba(33,117,155,.2)',bg:'#141a1f'},
  Webflow:{accent:'#4353FF',glow:'rgba(67,83,255,.2)',bg:'#14141f'},
  ESP:{accent:'#F59E0B',glow:'rgba(245,158,11,.18)',bg:'#1f1a14'},
  'E-commerce':{accent:'#A78BFA',glow:'rgba(167,139,250,.18)',bg:'#1a141f'}
};
function hostLabel(url){try{return new URL(url).hostname.replace(/^www\./,'')}catch(e){return url}}
function projInitials(name){return (name.match(/\b\w/g)||['?']).slice(0,2).join('').toUpperCase()}
function projTheme(tags){
  for(var t of tags){if(PROJ_STACK_THEME[t])return PROJ_STACK_THEME[t]}
  return {accent:'#A78BFA',glow:'rgba(167,139,250,.16)',bg:'#1a1a1f'};
}
function renderProject(p,badge,preview){
  var safeUrl=p.url.replace(/"/g,'&quot;');
  var host=hostLabel(p.url);
  var media;
  if(preview==='static'){
    var th=projTheme(p.tags);
    var stack=p.tags[0]||'Web';
    media='<div class="proj-media proj-media-static" style="--proj-accent:'+th.accent+';--proj-glow:'+th.glow+';--proj-bg:'+th.bg+'">'+
      '<span class="proj-media-badge">'+badge+'</span>'+
      '<span class="proj-init">'+projInitials(p.name)+'</span>'+
      '<span class="proj-host">'+host+'</span>'+
      '<span class="proj-stack">'+stack+'</span>'+
      '<a class="proj-open" href="'+safeUrl+'" target="_blank" rel="noopener noreferrer" aria-label="Open '+p.name+'"></a></div>';
  }else{
    media='<div class="proj-media" data-lazy-iframe><span class="proj-media-badge">'+badge+'</span>'+
      '<iframe data-src="'+safeUrl+'" title="'+p.name+' live preview" tabindex="-1" referrerpolicy="no-referrer"></iframe>'+
      '<a class="proj-open" href="'+safeUrl+'" target="_blank" rel="noopener noreferrer" aria-label="Open '+p.name+'"></a></div>';
  }
  return '<article class="proj" data-reveal data-url="'+safeUrl+'">'+media+
    '<div class="proj-tags">'+p.tags.map(function(t){return '<span>'+t+'</span>';}).join('')+'</div>'+
    '<h3>'+p.name+'</h3><span class="proj-url">'+host+'</span><p>'+p.desc+'</p>'+
    '<a class="proj-link" href="'+safeUrl+'" target="_blank" rel="noopener noreferrer">Visit live site <i class="iconsax" icon-name="arrow-right" aria-hidden="true"></i></a></article>';
}

function renderTestimonials(trackId){
  var star='<i class="iconsax" icon-name="star" aria-hidden="true"></i>';
  var html=TESTIMONIALS.map(function(t){
    return '<div class="testi"><div class="stars" aria-label="5 out of 5 stars">'+star.repeat(5)+'</div><p>"'+t[0]+'"</p><div class="testi-who"><div class="avatar" style="--a:'+t[3]+'">'+t[1].split(' ').map(function(w){return w[0];}).join('')+'</div><div><b>'+t[1]+'</b><span>'+t[2]+'</span></div></div></div>';
  }).join('');
  var el=document.getElementById(trackId);
  if(el) el.innerHTML=html+html;
}

function renderProcess(rowId){
  var el=document.getElementById(rowId);
  if(!el) return;
  el.innerHTML=PROCESS.map(function(p,i){
    return '<div class="proc-step'+(i===0?' active':'')+'" tabindex="0" role="button" aria-label="Step '+(i+1)+': '+p[1]+'"><span class="pline"></span><em>STEP 0'+(i+1)+'</em><i class="iconsax" icon-name="'+p[0]+'" aria-hidden="true"></i><h3>'+p[1]+'</h3><p>'+p[2]+'</p></div>';
  }).join('');
  var steps=[].slice.call(el.querySelectorAll('.proc-step'));
  steps.forEach(function(s){
    var act=function(){steps.forEach(function(x){x.classList.remove('active');});s.classList.add('active');};
    s.addEventListener('click',act);
    s.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();act();}});
  });
}

function renderMarquee(trackId){
  var el=document.getElementById(trackId);
  if(!el) return;
  var html=MARQ.map(function(t){return '<span>'+ic(t[0],17)+t[1]+'<em>/</em></span>';}).join('');
  el.innerHTML=html+html;
}

/* ============ LAZY IFRAMES ============ */
function initLazyProjIframes(){
  var pending=[],MAX=2,active=0;
  function pump(){
    while(active<MAX&&pending.length){
      var iframe=pending.shift();
      if(iframe.src||!iframe.dataset.src)continue;
      active++;
      iframe.src=iframe.dataset.src;
      var done=function(){active--;pump();};
      iframe.addEventListener('load',done,{once:true});
      iframe.addEventListener('error',done,{once:true});
    }
  }
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting)return;
      var iframe=e.target.querySelector('iframe[data-src]');
      if(iframe&&!iframe.src){pending.push(iframe);pump();}
      io.unobserve(e.target);
    });
  },{rootMargin:'120px',threshold:0.05});
  [].slice.call(document.querySelectorAll('.proj-media[data-lazy-iframe]')).forEach(function(m){io.observe(m);});
}

function initFeaturedIframe(){
  var section=document.getElementById('featured-product');
  var iframe=document.getElementById('featured-iframe');
  var loader=document.getElementById('featured-loader');
  if(!section||!iframe||!iframe.dataset.src)return;
  var hideLoader=function(){if(loader)loader.classList.add('is-hidden');};
  var load=function(){
    if(iframe.src)return;
    iframe.src=iframe.dataset.src;
    iframe.addEventListener('load',hideLoader,{once:true});
    iframe.addEventListener('error',hideLoader,{once:true});
  };
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      if(entries.some(function(e){return e.isIntersecting;})){load();io.disconnect();}
    },{rootMargin:'160px',threshold:0.08});
    io.observe(section);
  }else load();
}

/* ============ SHARED PAGE INIT ============ */

/* Call on every page after DOM + data ready */
function initNav(){
  var nav=document.getElementById('nav');
  var menuBtn=document.getElementById('menu-btn');
  var themeToggle=document.getElementById('theme-toggle');
  var THEME_KEY='upgrow.theme';

  var ICON_HMB='<i class="iconsax" icon-name="hamburger-menu" aria-hidden="true"></i>';
  var ICON_X='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  function applyTheme(theme){
    var dark=theme==='dark';
    if(dark) document.documentElement.setAttribute('data-theme','dark');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(THEME_KEY,dark?'dark':'light');
    if(themeToggle){
      themeToggle.setAttribute('aria-label',dark?'Switch to light theme':'Switch to dark theme');
      themeToggle.title=dark?'Light mode':'Dark mode';
    }
  }

  if(themeToggle){
    applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light');
    themeToggle.addEventListener('click',function(){
      applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');
    });
  }

  if(menuBtn){
    menuBtn.addEventListener('click',function(){
      var open=nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded',open);
      menuBtn.innerHTML=open?ICON_X:ICON_HMB;
    });
  }

  var navLinks=document.getElementById('nav-links');
  if(navLinks){
    navLinks.addEventListener('click',function(){
      nav.classList.remove('open');
      if(menuBtn) menuBtn.innerHTML=ICON_HMB;
    });
  }
}

function initScrollProgress(tlBoxId){
  var prog=document.getElementById('progress');
  var tlFill=tlBoxId?document.getElementById('tl-fill'):null;
  var tlBox=tlBoxId?document.getElementById(tlBoxId):null;
  addEventListener('scroll',function(){
    var h=document.documentElement;
    if(prog) prog.style.transform='scaleX('+(h.scrollTop/(h.scrollHeight-h.clientHeight))+')';
    if(tlFill&&tlBox){
      var r=tlBox.getBoundingClientRect();
      var p=Math.min(1,Math.max(0,(innerHeight*.7-r.top)/r.height));
      tlFill.style.transform='scaleY('+p+')';
    }
  },{passive:true});
}

function runCounters(scope){
  var reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  [].slice.call(document.querySelectorAll(scope+' .count')).forEach(function(el){
    if(el.dataset.done)return; el.dataset.done=1;
    var to=+el.dataset.to;
    if(reduced){el.textContent=to;return;}
    var o={v:0};
    anime({targets:o,v:to,duration:1600,easing:'easeOutQuad',round:1,
      update:function(){el.textContent=o.v;}});
  });
}

function initReveal(reduced){
  [].slice.call(document.querySelectorAll('[data-title]')).forEach(function(h){
    var words=h.textContent.trim().split(/\s+/);
    h.innerHTML=words.map(function(w){return '<span class="ln"><span>'+w+'</span></span>';}).join(' ');
  });
  var seen=new WeakSet();
  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(en){
      if(!en.isIntersecting||seen.has(en.target))return;
      seen.add(en.target); io.unobserve(en.target);
      var el=en.target;
      if(el.hasAttribute('data-title')){
        if(reduced){el.querySelectorAll('.ln>span').forEach(function(s){s.style.transform='none';});return;}
        anime({targets:el.querySelectorAll('.ln>span'),translateY:['108%','0%'],
          duration:900,delay:anime.stagger(60),easing:'easeOutExpo'});
      }else{
        if(reduced){el.style.opacity=1;el.style.transform='none';return;}
        anime({targets:el,opacity:[0,1],translateY:[28,0],duration:850,easing:'easeOutExpo'});
      }
      if(el.classList.contains('stat-card'))runCounters('.stats-grid');
    });
  },{threshold:.18});
  [].slice.call(document.querySelectorAll('[data-title],[data-reveal]')).forEach(function(el){io.observe(el);});
}

function initCursorDot(isMobile,reduced){
  var dot=document.getElementById('cursor-dot');
  if(!dot)return;
  if(!isMobile&&!reduced&&matchMedia('(hover:hover)').matches){
    addEventListener('mousemove',function(e){dot.style.left=e.clientX+'px';dot.style.top=e.clientY+'px';},{passive:true});
    [].slice.call(document.querySelectorAll('.magnetic')).forEach(function(btn){
      btn.addEventListener('mousemove',function(e){
        var r=btn.getBoundingClientRect();
        btn.style.transform='translate('+((e.clientX-r.left-r.width/2)*.22)+'px,'+((e.clientY-r.top-r.height/2)*.3)+'px)';
      });
      btn.addEventListener('mouseleave',function(){btn.style.transform='';});
    });
  }else{dot.remove();}
}

function initContactForm(reduced){
  var form=document.getElementById('contact-form');
  if(!form)return;
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var ok=true;
    [].slice.call(this.querySelectorAll('[required]')).forEach(function(f){
      var bad=!f.value.trim()||(f.type==='email'&&!/^\S+@\S+\.\S+$/.test(f.value));
      f.style.borderColor=bad?'#FF6D5A':''; if(bad)ok=false;
    });
    if(!ok)return;
    var btn=form.querySelector('button[type=submit]');
    if(btn)btn.style.display='none';
    var fs=document.getElementById('form-success');
    if(fs){fs.classList.add('show');
      if(!reduced)anime({targets:fs,opacity:[0,1],scale:[.94,1],duration:500,easing:'easeOutExpo'});}
  });
}
