
function RDS(){

	const Sequelize = require('sequelize');
	this.sequelize = new Sequelize('main_development','root','welcome1', {
		host: 'localhost',
		dialect: 'mysql',
		pool: {
			max: 5,
			min: 0,
			qcquire: 30000,
			idle: 10000
		},
		dialectOptions: {
			multipleStatements: true
		}
	});

	
};

module.exports = RDS;