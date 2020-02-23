const express = require('express');

const { Client } = require('pg');

const server = express();

const client = new Client({
    user: 'postgres',
    host: '192.168.99.103',
    database: 'users',
    password: 'docker',
    port: 5432,
});

client.connect(err => {
    if (err) {
        console.log("Conexão não foi possível!");
    } else {
        console.log("Conexão realizada!");
    }
});

let counter = 0;

server.use(express.json());

server.use((req, res, next) => {
    console.log("--------------------");
    console.log(`Número de requisições: ${++counter}`);
    console.log(`Método chamado: ${req.method}`);
    console.log(`URL chamada: ${req.url}`);
    console.log("--------------------");

    return next();
});

//Middlewares
const checkIfIdExists = (req, response, next) => {
    const { id } = req.params;
    const values = [id];

    try {
        client.query(`SELECT * FROM "user" where "id"=$1`, values, (err, res) => {
            if (err) {
                throw err;
            }

            const result = res.rows[0];

            if (!result) {
                return response.status(400).json({ error: `User with id='${id}' does not exists!` });
            }

            return next();
        });
    } catch(error) {
        return response.status(500).json({ error: 'Backend error!' });
    }
};

const checkIfEmailExists = (req, response, next) => {
    const { email } = req.body;
    const values = [email];

    try {
        client.query(`SELECT * FROM "user" where "email"=$1`, values, (err, res) => {
            if (err) {
                throw err;
            }

            const result = res.rows[0];

            if (result) {
                return response.status(400).json({ error: `User with email='${email}' already exists!` });
            }

            return next();
        });
    } catch(error) {
        return response.status(500).json({ error: 'Backend error!' });
    }
};

const checkNameBodyRequest = (req, response, next) => {
    const { name } = req.body;

    if (!name) {
        return response.status(400).json({ error: "Field 'name' is required!" });
    }
    return next();
};

const checkEmailBodyRequest = (req, response, next) => {
    const { email } = req.body;

    if (!email) {
        return response.status(400).json({ error: "Field 'email' is required!" });
    }
    return next();
};

const checkPasswordBodyRequest = (req, response, next) => {
    const { password } = req.body;

    if (!password) {
        return response.status(400).json({ error: "Field 'password' is required!" });
    }
    return next();
};

//Routes
server.get('/users', (req, response) => {
    client.query('SELECT * FROM "user"', (err, res) => {
        if (err) {
            return response.status(500).json({ error: 'Backend error!' });
        }
        return response.json(res.rows);
    });
});

server.post('/users', checkNameBodyRequest, checkEmailBodyRequest, checkPasswordBodyRequest, checkIfEmailExists, (req, response) => {
    const { name, email, password } = req.body;

    const values = [name, email, password];

    client.query('INSERT INTO "user"("name", "email", "password") VALUES($1::text, $2::text, $3::text) RETURNING *', values, (err, res) => {
        if (err) {
            return response.status(500).json({ error: 'Backend error!' });
        }
        return response.json(res.rows[0]);
    });
});

server.put('/users/:id', checkEmailBodyRequest, checkIfIdExists, checkIfEmailExists, (req, response) => {
    const { id } = req.params;
    const { email } = req.body;
    const values = [email, id];

    client.query('UPDATE "user" SET "email"=$1 WHERE "id"=$2 RETURNING *', values, (err, res) => {
        if (err) {
            return response.status(500).json({ error: 'Backend error!' });
        }
        return response.json(res.rows[0]);
    });
});

server.delete('/users/:id', checkIfIdExists, (req, response) => {
    const { id } = req.params;
    const values = [id];

    client.query('DELETE FROM "user" WHERE "id"=$1 RETURNING *', values, (err, res) => {
        if (err) {
            return response.status(500).json({ error: 'Backend error!' });
        }
        return response.json(res.rows[0]);
    });
});

server.listen(3000);
