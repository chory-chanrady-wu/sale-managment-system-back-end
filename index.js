const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// -------------------- Swagger setup --------------------
const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Sale Management System API',
      version: '1.0.0',
      description: 'API documentation for Sale Management System',
    },
    servers: [
      { url: `http://localhost:${port}` }
    ],
  },
  apis: ['./routes/*.js'], // Path to your route files
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
// Routes
app.use('/api/client-types', require('./routes/clientTypes'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/product-types', require('./routes/productTypes'));
app.use('/api/products', require('./routes/products'));
app.use('/api/invoices', require('./routes/invoices'));
//app.use('/api/reports', require('./routes/reports'));
app.use('/api/invoice-details', require('./routes/invoiceDetails'));

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
