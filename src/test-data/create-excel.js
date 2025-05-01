import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read the CSV file
const csvPath = path.join(__dirname, 'sample_products.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV content
const workbook = XLSX.utils.book_new();
const worksheet = XLSX.utils.csv_to_sheet(csvContent);

// Add the worksheet to the workbook
XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');

// Write to Excel file
const excelPath = path.join(__dirname, 'sample_products.xlsx');
XLSX.writeFile(workbook, excelPath);

console.log('Excel file created successfully at:', excelPath);