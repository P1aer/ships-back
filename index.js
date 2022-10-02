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
        res.json({
            users: rooms.get(id).readyState
        })
    }
    else res.json(null)
})

//тут почекать
app.post("/rooms", (req, res) => {

    const { roomId, name } = req.body;

    if (!rooms.has(roomId)){
        rooms.set(
            roomId, {
                'users':new Set([]),
                "readyState": {},
                "public" : true,
                "name": name
            }
        )
    }
    res.send();
})




io.on("connection", (socket)=> {
    socket.on('ROOM:JOIN',(roomId) => {
        const room =  rooms.get(roomId)
        if (!room) {
            return
        }
        if (room['users'].size >= 2 ) {
            return;
        }
        socket.join(roomId);
        room['users'].add(socket.id);
        room.readyState[socket.id] = false
        const users = [...room["users"].values()];
        socket.to(roomId).emit("ROOM:JOINED",room.readyState);
    })

    socket.on("GAME:TURN",(roomId) => {

    })

    socket.on('ROOM:LEAVE',(roomId, userId) => {
        const room = rooms.get(roomId)
        if (!room) {
            return;
        }
        if (!room['users'].has(userId)) {
            return;
        }
        room['users'].delete(userId)
        if (room['users'].size === 0) {
            rooms.delete(roomId)
            return
        }
        delete room.readyState[socket.id]
        const users = [...room["users"].values()];
        socket.to(roomId).emit("ROOM:LEAVED",room.readyState);
    })

    socket.on('ROOM:STATE',(roomId, state) => {
/*        console.log(roomId)
        console.log(rooms)*/
        const room = rooms.get(roomId)
        room.readyState[socket.id] = state
        socket.to(roomId).emit("ROOM:STATE",room.readyState);
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
            delete obj.readyState[socket.id]
            const users = [...obj["users"].values()];
            socket.to(roomId).emit("ROOM:LEAVED",obj.readyState);
        })
    })
})


server.listen(process.env.PORT || port, () => {
    console.log("ALIVE")
})