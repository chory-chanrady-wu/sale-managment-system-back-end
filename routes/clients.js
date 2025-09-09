// back-end/routes/clients.js
const express = require('express');
const oracledb = require('oracledb');
const router = express.Router();
const { getConnection } = require('../config/db');

// GET all clients
router.get('/', async (req, res) => {
    try {
        const conn = await getConnection();
        const result = await conn.execute(
            'SELECT * FROM Clients',
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        await conn.close();
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET by CLIENT_NO
router.get('/:id', async (req, res) => {
    try {
        const conn = await getConnection();
        const result = await conn.execute(
            'SELECT * FROM Clients WHERE CLIENT_NO = :id',
            [req.params.id],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        await conn.close();
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE
router.post('/', async (req, res) => {
    try {
        const { CLIENTNAME, ADDRESS, CITY, PHONE, CLIENT_TYPE_ID, EMAIL, GENDER } = req.body;
        const conn = await getConnection();

        // Validation
        if (!CLIENTNAME) return res.status(400).json({ error: "Client Name is required" });
        if (!CLIENT_TYPE_ID) return res.status(400).json({ error: "Client Type is required" });

        // Get CLIENT_TYPE and DISCOUNT from CLIENT_TYPE table
        const typeResult = await conn.execute(
            'SELECT CLIENT_TYPE, DISCOUNT_RATE FROM CLIENT_TYPE WHERE CLIENT_TYPE_ID = :id',
            [CLIENT_TYPE_ID],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (typeResult.rows.length === 0) {
            await conn.close();
            return res.status(400).json({ error: "Invalid Client Type" });
        }

        const { CLIENT_TYPE, DISCOUNT_RATE } = typeResult.rows[0];

        // Insert into CLIENTS (no CLIENT_ID, generated automatically)
        await conn.execute(
            `INSERT INTO CLIENTS 
             (CLIENTNAME, ADDRESS, CITY, PHONE, CLIENT_TYPE_ID, CLIENT_TYPE, DISCOUNT, EMAIL, GENDER, CREATED_AT)
             VALUES 
             (:CLIENTNAME, :ADDRESS, :CITY, :PHONE, :CLIENT_TYPE_ID, :CLIENT_TYPE, :DISCOUNT, :EMAIL, :GENDER, SYSDATE)`,
            { CLIENTNAME, ADDRESS, CITY, PHONE, CLIENT_TYPE_ID, CLIENT_TYPE, DISCOUNT: DISCOUNT_RATE, EMAIL, GENDER },
            { autoCommit: true }
        );

        await conn.close();
        res.json({ message: 'Client added successfully' });
        } catch (err) {
            console.error("❌ Oracle error inserting client:", err);
            res.status(500).json({ error: err.message });
        }
});


// UPDATE
router.put('/:id', async (req, res) => {
    try {
        const { CLIENTNAME, ADDRESS, CITY, PHONE, CLIENT_TYPE_ID, EMAIL, GENDER } = req.body;
        const conn = await getConnection();

        if (!CLIENTNAME) return res.status(400).json({ error: "Client Name is required" });
        if (!CLIENT_TYPE_ID) return res.status(400).json({ error: "Client Type is required" });

        // Get CLIENT_TYPE and DISCOUNT from CLIENT_TYPE table
        const typeResult = await conn.execute(
            'SELECT CLIENT_TYPE, DISCOUNT_RATE FROM CLIENT_TYPE WHERE CLIENT_TYPE_ID = :id',
            [CLIENT_TYPE_ID],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        if (typeResult.rows.length === 0) {
            await conn.close();
            return res.status(400).json({ error: "Invalid Client Type" });
        }

        const { CLIENT_TYPE, DISCOUNT_RATE } = typeResult.rows[0];

        await conn.execute(
            `UPDATE CLIENTS
             SET CLIENTNAME = :CLIENTNAME,
                 ADDRESS = :ADDRESS,
                 CITY = :CITY,
                 PHONE = :PHONE,
                 CLIENT_TYPE_ID = :CLIENT_TYPE_ID,
                 CLIENT_TYPE = :CLIENT_TYPE,
                 DISCOUNT = :DISCOUNT,
                 EMAIL = :EMAIL,
                 GENDER = :GENDER
             WHERE CLIENT_NO = :id`,
            { CLIENTNAME, ADDRESS, CITY, PHONE, CLIENT_TYPE_ID, CLIENT_TYPE, DISCOUNT: DISCOUNT_RATE, EMAIL, GENDER, id: req.params.id },
            { autoCommit: true }
        );

        await conn.close();
        res.json({ message: 'Client updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        const conn = await getConnection();
        await conn.execute(
            'DELETE FROM CLIENTS WHERE CLIENT_NO = :id',
            [req.params.id],
            { autoCommit: true }
        );
        await conn.close();
        res.json({ message: 'Client deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
