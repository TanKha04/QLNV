const xlsx = require('xlsx');
const fs = require('fs');
const files = fs.readdirSync('./uploads');
const excelFile = files.find(f => f.endsWith('.xlsx'));
if (excelFile) {
  const wb = xlsx.readFile('./uploads/' + excelFile);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(ws, {header: 1});
  console.log(JSON.stringify(data.slice(0, 10), null, 2));
} else {
  console.log("No excel file found");
}
