const initSqlJs = require('sql.js');
const fs = require('fs');
initSqlJs().then(SQL => {
  const buf = fs.readFileSync('quilo.db');
  const db = new SQL.Database(buf);
  const result = db.exec("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('Tables:', result.length > 0 ? result[0].values.map(r => r[0]).join(', ') : 'NONE');
  db.close();
});
