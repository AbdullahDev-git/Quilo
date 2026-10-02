const http = require('http');

function test(name, method, path, body, cookie) {
  return new Promise((resolve) => {
    const opts = {
      hostname: '127.0.0.1', port: 4000, path, method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (cookie) opts.headers['Cookie'] = cookie;
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const setCookie = res.headers['set-cookie'];
        const sessionCookie = setCookie ? setCookie[0]?.split(';')[0] : null;
        const status = res.statusCode;
        resolve({ status, data, sessionCookie });
      });
    });
    req.on('error', (e) => resolve({ status: 0, data: e.message, sessionCookie: null }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  let cookie = null;
  let results = [];

  // 1 Health
  let r = await test('Health', 'GET', '/api/health');
  results.push(`1. HEALTH: ${r.status === 200 ? 'PASS' : 'FAIL'} (${r.status})`);

  // 2 Register (may get 409 if user already exists)
  r = await test('Register', 'POST', '/api/auth/register', { email:'test@quilo.dev', name:'Test User', password:'password123' });
  if (r.sessionCookie) cookie = r.sessionCookie;
  const regOk = r.status === 201 || r.status === 409;
  results.push(`2. REGISTER: ${regOk ? 'PASS' : 'FAIL'} (${r.status}) ${r.data.substring(0,80)}`);

  // 3 Login
  r = await test('Login', 'POST', '/api/auth/login', { email:'test@quilo.dev', password:'password123' }, cookie);
  if (r.sessionCookie) cookie = r.sessionCookie;
  results.push(`3. LOGIN: ${r.status === 200 ? 'PASS' : 'FAIL'} (${r.status})`);

  // 4 Me
  r = await test('Me', 'GET', '/api/auth/me', null, cookie);
  results.push(`4. ME: ${r.status === 200 ? 'PASS' : 'FAIL'} (${r.status}) ${r.data.substring(0,60)}`);

  // 5 Dashboard
  r = await test('Dashboard', 'GET', '/api/dashboard', null, cookie);
  results.push(`5. DASHBOARD: ${r.status === 200 ? 'PASS' : 'FAIL'} (${r.status})`);

  // 6 Rules
  r = await test('Rules', 'GET', '/api/rules', null, cookie);
  results.push(`6. RULES: ${r.status === 200 ? 'PASS' : 'FAIL'} (${r.status})`);

  // 7 Create Rule
  r = await test('CreateRule', 'POST', '/api/rules', { name:'Test Rule', conditions:[{field:'amount',operator:'greater_than',value:'100'}], actions:[{type:'flag',config:{}}], logic:'all' }, cookie);
  results.push(`7. CREATE RULE: ${r.status === 201 ? 'PASS' : 'FAIL'} (${r.status}) ${r.data.substring(0,80)}`);

  // 8 Stores
  r = await test('Stores', 'GET', '/api/stores', null, cookie);
  results.push(`8. STORES: ${r.status === 200 ? 'PASS' : 'FAIL'} (${r.status})`);

  // 9 Orders
  r = await test('Orders', 'GET', '/api/orders', null, cookie);
  results.push(`9. ORDERS: ${r.status === 200 ? 'PASS' : 'FAIL'} (${r.status})`);

  // 10 Analytics
  r = await test('Analytics', 'GET', '/api/analytics', null, cookie);
  results.push(`10. ANALYTICS: ${r.status === 200 ? 'PASS' : 'FAIL'} (${r.status})`);

  // 11 Activity
  r = await test('Activity', 'GET', '/api/activity', null, cookie);
  results.push(`11. ACTIVITY: ${r.status === 200 ? 'PASS' : 'FAIL'} (${r.status})`);

  // 12 Approvals
  r = await test('Approvals', 'GET', '/api/approvals', null, cookie);
  results.push(`12. APPROVALS: ${r.status === 200 ? 'PASS' : 'FAIL'} (${r.status})`);

  // 13 Webhooks
  r = await test('Webhooks', 'GET', '/api/webhooks', null, cookie);
  results.push(`13. WEBHOOKS: ${r.status === 200 ? 'PASS' : 'FAIL'} (${r.status})`);

  // 14 Integrations
  r = await test('Integrations', 'GET', '/api/integrations', null, cookie);
  results.push(`14. INTEGRATIONS: ${r.status === 200 ? 'PASS' : 'FAIL'} (${r.status})`);

  // 15 Spend Caps
  r = await test('SpendCaps', 'GET', '/api/spend-caps', null, cookie);
  results.push(`15. SPEND CAPS: ${r.status === 200 ? 'PASS' : 'FAIL'} (${r.status})`);

  // 16 Team Members
  r = await test('TeamMembers', 'GET', '/api/team-members', null, cookie);
  results.push(`16. TEAM MEMBERS: ${r.status === 200 ? 'PASS' : 'FAIL'} (${r.status})`);

  // 17 Users
  r = await test('Users', 'GET', '/api/users/me', null, cookie);
  results.push(`17. USERS: ${r.status === 200 ? 'PASS' : 'FAIL'} (${r.status})`);

  // 18 Unauth
  r = await test('Unauth', 'GET', '/api/rules');
  results.push(`18. UNAUTH BLOCK: ${r.status === 401 ? 'PASS' : 'FAIL'} (${r.status})`);

  // 19 Validation
  r = await test('Validation', 'POST', '/api/auth/register', { email:'bad', password:'short' });
  results.push(`19. VALIDATION: ${r.status === 400 ? 'PASS' : 'FAIL'} (${r.status})`);

  // 20 CSRF Token
  r = await test('CSRF', 'GET', '/api/auth/csrf-token', null, cookie);
  results.push(`20. CSRF TOKEN: ${r.status === 200 ? 'PASS' : 'FAIL'} (${r.status})`);

  // 21 AI Generate Rule (may fail with invalid API key)
  r = await test('AI Generate', 'POST', '/api/ai/generate-rule', { prompt:'Auto-refund orders under $30 from US customers' }, cookie);
  const aiOk = r.status === 200 || r.status === 503;
  results.push(`21. AI GENERATE: ${aiOk ? 'PASS' : 'FAIL'} (${r.status}) ${r.data.substring(0,80)}`);

  // 22 AI Suggest Rules (may fail with invalid API key)
  r = await test('AI Suggest', 'POST', '/api/ai/suggest-rules', {}, cookie);
  const aiSugOk = r.status === 200 || r.status === 503;
  results.push(`22. AI SUGGEST: ${aiSugOk ? 'PASS' : 'FAIL'} (${r.status})`);

  console.log(results.join('\n'));
}

run();
