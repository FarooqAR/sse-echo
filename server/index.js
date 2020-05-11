const express = require("express");
const cors = require('cors');
const app = express();

const connections = new Map();
let clientId = 0;

const defaultData = [
    {
        data: "Hello world 🌎😀"
    },
    {
        data: "Welcome to SSE Demo 👏👏"
    },
    {
        id: 1,
        data: "This one will set an id 1"
    },
    {
        data: `{"title": "This one is json!"}`
    },
    {
        data: `{"title": "This one is json too!", "hello": {"title": "It has nested json as well!"}}`
    },
    {
        event: 'close',
        data: "Send event: close at the end like here to close the stream."
    }
];

function formatEvent(ev) {
    const {event, id, retry, data} = ev;
    let evText = "";
    if (event !== undefined) {
        evText +=  `event: ${event}\n`;
    }
    if (id !== undefined) {
        evText += `id: ${id}\n`;
    }
    if (retry !== undefined) {
        evText += `retry: ${retry}\n`;
    }
    evText += `data: ${data}\n\n`;
    return evText;
}

function sendDelayedEvent(res, req, data, delay) {
    data = data.split('\n\n');
    connections.set(++clientId, {
        currentIndex: 0,
        res,
        data,
        intervalId: (function (id, delay) {
            return setInterval(() => {
                const con = connections.get(id);
                if (con.currentIndex === con.data.length) {
                    con.res.end();
                    clearInterval(con.intervalId);
                    connections.delete(id);
                } else {
                    res.write(con.data[con.currentIndex++] + "\n\n");
                }
            }, delay)
        })(clientId, delay)
    });

    (function (id) {
        req.on('close', () => {
            const con = connections.get(id);
            if (con) {
                clearInterval(con.intervalId);
                connections.delete(id);
            }
        })
    })(clientId)
}

app.get("/events", cors(), function (req, res) {
    let data = req.query.data;
    let delay = req.query.delay;
    delay = Number(delay);
    delay = isNaN(delay) ? 0 : Math.min(10, delay);

    if (!data) {
        data = defaultData.map(formatEvent).join('');
    } else {
        data = decodeURIComponent(data);
    }

    res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		'Connection': 'keep-alive'
    });

    if (data.length > 500) {
        res.write("event:close\ndata: I told you I cannot allow this large stream!\n\n");
        res.end();
        return;
    }

    if (delay <= 0) {
        res.write(data);
        res.end();
    } else {
        sendDelayedEvent(res, req, data, delay * 1000);
    }
})

app.listen(process.env.PORT || 8082);