const allowedOrigins = [
	'http://localhost:3000/',
	'http://localhost:3000',
	'http://localhost',
	'http://localhost/',
	'http://localhost:1212',
	'http://localhost:1212/',
	'http://localhost:3001'
]


const corsOptions = {
	origin: (origin: any, callback: any) => {
		if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
			callback(null, true)
		} else {
			console.log(origin)
			callback(new Error(`Not Allowed by CORS : ${origin}`));
		}
	},

}


export default corsOptions;
