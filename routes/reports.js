const express = require('express');
const oracledb = require('oracledb');
const { getConnection } = require('../config/db');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const router = express.Router();

// -----------------------------
// Utility to sanitize Oracle objects for JSON
// -----------------------------
function sanitizeRows(rows) {
  return rows.map(row => {
    const safeRow = {};
    for (const key in row) {
      const value = row[key];
      if (value && typeof value === 'object') {
        try {
          safeRow[key] = JSON.parse(JSON.stringify(value));
        } catch {
          safeRow[key] = String(value);
        }
      } else {
        safeRow[key] = value;
      }
    }
    return safeRow;
  });
}

// -----------------------------
// GET /templates
// -----------------------------
router.get('/templates', async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      'SELECT * FROM REPORT_TEMPLATES ORDER BY TEMPLATEID',
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    res.json(sanitizeRows(result.rows));
  } catch (err) {
    console.error('Error fetching templates:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// -----------------------------
// POST /templates
// -----------------------------
router.post('/templates', async (req, res) => {
  const { TemplateName, SqlQuery } = req.body;
  if (!TemplateName || !SqlQuery)
    return res.status(400).json({ error: 'Template name and SQL query required' });

  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      'INSERT INTO REPORT_TEMPLATES (TEMPLATENAME, SQLQUERY) VALUES (:TemplateName, :SqlQuery)',
      { TemplateName, SqlQuery },
      { autoCommit: true }
    );
    res.json({ message: 'Report template saved successfully' });
  } catch (err) {
    console.error('Error saving template:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// -----------------------------
// POST /preview
// -----------------------------
router.post('/preview', async (req, res) => {
  const { SqlQuery } = req.body;
  if (!SqlQuery) return res.status(400).json({ error: 'SQL query required for preview' });

  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(SqlQuery, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
    res.json(result.rows);
  } catch (err) {
    console.error('Error previewing SQL:', err);
    res.status(400).json({ error: `Invalid SQL query: ${err.message}` });
  } finally {
    if (conn) await conn.close();
  }
});

// -----------------------------
// DELETE /templates/:id
// -----------------------------
router.delete('/templates/:id', async (req, res) => {
  const id = Number(req.params.id);
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      'DELETE FROM REPORT_TEMPLATES WHERE TEMPLATEID = :id',
      [id],
      { autoCommit: true }
    );
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json({ message: 'Template deleted successfully' });
  } catch (err) {
    console.error('Error deleting template:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (conn) await conn.close();
  }
});

// -----------------------------
// POST /generate/:id
// -----------------------------
router.post('/generate/:id', async (req, res) => {
  const { format } = req.body; // 'json', 'excel', 'pdf'
  const templateId = req.params.id;
  let conn;

  try {
    conn = await getConnection();

    // Fetch template
    const templateRes = await conn.execute(
      'SELECT * FROM REPORT_TEMPLATES WHERE TEMPLATEID = :id',
      { id: templateId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );


    if (!templateRes.rows.length)
      return res.status(404).json({ error: 'Template not found' });

    const template = templateRes.rows[0];

    // Pick binds only if needed
    let binds = req.body.binds && Object.keys(req.body.binds).length > 0
      ? req.body.binds
      : [];

    // Execute safely
    const dataRes = await conn.execute(
      template.SQLQUERY,
      binds,
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );


    const data = sanitizeRows(dataRes.rows);

    if (!format || format === 'json') {
      return res.json(data);
    }

    if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(template.TEMPLATENAME || 'Report');

      if (data.length > 0) {
        sheet.columns = Object.keys(data[0]).map(key => ({ header: key, key }));
        sheet.addRows(data);
      }

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${template.TEMPLATENAME}.xlsx`
      );

      await workbook.xlsx.write(res);
      return res.end();
    }

    if (format === 'pdf') {
      const doc = new PDFDocument({ margin: 20, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=${template.TEMPLATENAME}.pdf`
      );
      doc.pipe(res);

      doc.fontSize(18).text(template.TEMPLATENAME, { align: 'center' });
      doc.moveDown();

      if (data.length > 0) {
        const keys = Object.keys(data[0]);
        const columnWidth = 500 / keys.length;

        keys.forEach(key =>
          doc.fontSize(10).text(key, { continued: true, width: columnWidth })
        );
        doc.moveDown();

        data.forEach(row => {
          keys.forEach(key =>
            doc.text(String(row[key]), { continued: true, width: columnWidth })
          );
          doc.moveDown();
        });
      } else {
        doc.text('No data available', { align: 'center' });
      }

      return doc.end();
    }

    return res.status(400).json({ error: 'Invalid format' });
  } catch (err) {
    console.error('Error generating report:', err);
    return res.status(400).json({ error: `Invalid SQL query: ${err.message}` });
  } finally {
    if (conn) await conn.close();
  }
});

module.exports = router;
