import dotenv from 'dotenv';
dotenv.config();
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import Connection from './database/conn.js';
import router from './routers/route.js';

const app = express();

/** middlewares */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'));
app.disable('x-powered-by'); // less hackers know about our stack

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const port =process.env.PORT || 8080;

/** HTTP GET Request */
app.get('/', (req, res) => {
    res.status(201).json("Home GET Request");
});


/** api routes */
app.use('/api', router)


try {
    await Connection();
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
} catch (error) {
    console.log("Error: ", error.message);
}
