import express from "express"
import http from "http"
import { Server } from "socket.io"
import cors from "cors"

const app = express()
const server = http.createServer(app)

// deploy client
const io = new Server(server, {
    cors:{
        origin: ["http://localhost:8080"]
    }
})

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true} ))


const port = 3001;

const rooms = new Map()

app.get("/",(req,res) => {
    res.send("hello")
})

app.get("/rooms", (req,res) => {

    const copy = new Map()
    rooms.forEach((value, key) => {
        copy.set(key, {
            users: [...value.users],
            name: value.name,
            public: value.public,
        })
    });
    const map = Object.fromEntries(copy)
    res.json({
            rooms: map,
            size: rooms.size
    })
})

app.get("/rooms/:id",(req,res) => {

    const id = req.params.id

    if (rooms.has(id) && rooms.get(id)["users"].size <= 2) {
        res.json(rooms.get(id))
    }
    else res.json(null)
})

//тут почекать
app.post("/rooms", (req, res) => {

    const { roomId, name } = req.body;

    if (!rooms.has(roomId)){
        rooms.set(
            roomId, {
                'users':new Set([roomId]),
                "public" : true,
                "name": name
            }
        )
    }

    res.send();
})




io.on("connection", (socket)=> {
    socket.on('ROOM:JOIN',(roomId , cb ) => {
        socket.join(roomId);
        rooms.get(roomId)['users'].add(socket.id);
        const users = [...rooms.get(roomId)["users"].values()];
        cb()
        socket.to(roomId).emit("ROOM:PREPARATION",users);
    })

    socket.on("GAME:TURN",() => {

    })

    socket.on("disconnect",() => {
        rooms.forEach((obj, roomId, map) => {
            if (!obj["users"].delete(socket.id)){
                return
            }
            if (obj["users"].size === 0 ) {
                map.delete(roomId)
                return;
            }
            const users = [...obj["users"].values()];
            socket.to(roomId).emit("ROOM:SET_USERS",users);
        })
    })
})


server.listen(process.env.PORT || port, () => {
    console.log("ALIVE")
})