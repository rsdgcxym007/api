const express = require('express')
const cors = require('cors')
const app = express()
const port = 4000
const jwt = require('./src/middlewares/jwt')
const moment = require('moment')
const multer = require('multer')
var fs = require('fs');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/')
  },
  filename: (req, file, cb) => {
    cb(null, 'file-' + Date.now() + '.' +
      file.originalname.split('.')[file.originalname.split('.').length - 1])
  }
})

const upload = multer({
  storage: storage
})

const {
  PrismaClient
} = require('@prisma/client')
const {
  query,
  text
} = require('express')



const prisma = new PrismaClient()
app.use(cors())
app.use(express.urlencoded({
  extended: false
}))
app.use(express.json())

app.get('/image/:name', async (req, res) => {
  const {
    name
  } = req.params
  res.writeHead(200, {
    'content-type': 'image/jpg'
  });
  fs.createReadStream(`uploads/${name}`).pipe(res);
})

app.post('/api/upload', upload.single('file'), async (req, res) => {

  console.log(req.file)
  return res.json({
    data: 123
  })
})

app.get('/', async (req, res) => {
  const result = await prisma.types.findMany();

  result.forEach(x => {
    x.created_at = moment(x.created_at).format("YYYY-MM-DD HH:mm:ss")
    x.updated_at = moment(x.created_at).format("YYYY-MM-DD HH:mm:ss")
  })

  return res.json(result)
})


app.post('/api/auth/login', async (req, res) => {
  const {
    email,
    password
  } = req.body;


  let errorFlag = false
  let message = 'fail'


  const data = await prisma.users.findFirst({
    where: {
      email,
      password
    }
  });

  if (!data || errorFlag) {
    return res.json({
      result: false,
      message
    })
  }
  const {
    firstname,
    lastname
  } = data

  const token = await jwt.generatetoken(data);
  return res.json({
    result: true,
    message: 'success',
    firstname,
    lastname,
    token
  })
})

app.post('/api/auth/register', async (req, res) => {
  const data = req.body;

  // return res.json(data)
  const {
    firstname,
    lastname,
    tel,
    email,
    password,
    address,
    group
  } = data
  let error = false;
  let message = '';
  let count = 0

  const {
    id
  } = await prisma.groups.findFirst({
    where: {
      name: group,
      NOT: {
        id: 1
      }
    },
    select: {
      id: true
    }
  })

  data.group_id = id

  delete data.group

  if (!firstname.length > 0) {
    message += !count ? 'firstname less than 0 char' : ', firstname less than 0 char'
    count++
    error = true
  }
  if (!lastname.length > 0) {
    message += !count ? 'lastname less than 0 char' : ", " + 'lastname less than 0 char'
    count++
    error = true
  }
  if (tel.length !== 10) {
    message += !count ? 'tel equal 10 char' : ", " + 'tel equal 10 char'
    count++
    error = true
  }
  if (!email.length > 8) {
    message += !count ? 'email less than 8 char' : ", " + 'email less than 8 char'
    count++
    error = true
  }
  if (!password.length > 8) {
    message += !count ? 'password less than 8 char' : ", " + 'password less than 8 char'
    count++
    error = true
  }
  if (!address.length > 5) {
    message += !count ? 'address less than 5 char' : ", " + 'address less than 5 char'
    count++
    error = true
  }
  const user = await prisma.users.findFirst({
    where: {
      email: data.email
    }
  })
  if (user) {
    if (user.email === email) {
      message += !count ? '????????????????????????????????????????????????????????????' : ", " + '????????????????????????????????????????????????????????????'
      count++
      error = true
    }
  }

  if (error) {
    return res.json({
      result: false,
      message
    })
  }

  await prisma.users.create({
    data
  });

  return res.json({
    result: true,
    message: 'register success'
  })

})

app.get('/api/auth/user', jwt.verifytoken, async (req, res) => {
  const payload = req.jwtpayload
  return res.json(payload);
})

app.get('/api/master/type', async (req, res) => {
  const result = await prisma.types.findMany({
    orderBy: [{
      name: 'asc',
    }, ]
  });

  if (!result) {
    return res.json({
      result: null,
      message: "error"
    })
  }

  const items = result.map(function (item) {
    return item['name'];
  });
  return res.json({
    result: items,
    message: "success"
  })
})

app.get('/api/master/group', async (req, res) => {
  const result = await prisma.groups.findMany({
    where: {
      NOT: {
        id: 1
      }
    },
    orderBy: [{
      name: 'asc',
    }, ],
  });

  if (!result) {
    return res.json({
      result: null,
      message: "error"
    })
  }

  const items = result.map(function (item) {
    return item['name'];
  });
  return res.json({
    result: items,
    message: "success"
  })
})

app.post('/api/manage/request', async (req, res) => {
  const data = req.body

  const type = await prisma.types.findFirst({
    where: {
      name: data.type
    }
  })
  delete data.type
  data.type_id = type.id


  const task = await prisma.tasks.create({
    data
  })


  if (!task) {
    return res.json({
      result: false,
      message: "request error"
    })
  }

  return res.json({
    result: true,
    message: "request success"
  })
})




app.post('/api/manage/taskall', async (req, res) => {
  const {
    userId
  } = req.body
  const results = await prisma.$queryRawUnsafe(`select * from vw_tasks a where a."user_id" = $1`, userId)

  const headers = [{
      text: '???????????????',
      value: 'status_name'
    }, {
      text: '??????????????????',
      value: 'type'
    },
    {
      text: '?????????????????????????????????',
      value: 'name'
    },
    {
      text: '????????????????????????',
      value: 'tel'
    },
    {
      text: '?????????????????????',
      value: 'address'
    },
    {
      text: '????????????????????????',
      value: 'remark'
    },

    {
      text: '?????????????????????????????????',
      value: 'created_at'
    }
    // {
    //   text: '???????????????????????????',
    //   value: 'help'
    // },
  ];
  return res.json({
    result: results,
    headers
  })
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})