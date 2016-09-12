var mysql = require('mysql');

var pool = mysql.createPool({
    connectionLimit: 100,
    host     : process.env.dojo_mysql_host,
    user     : process.env.dojo_mysql_username,
    password : process.env.dojo_mysql_password,
    database : process.env.dojo_mysql_database,
    debug    : false
});

exports.getUsernames = function () {
    return new Promise(function(resolve, reject) {
        const queryString = 'SELECT `NickName` from `User`;';
        executeQuery(queryString).then(function (data) {
            var user_names = [];
            data.forEach(function (row) {
                user_names.push(row.NickName);
            });
            resolve(user_names);
        }).catch(function (err) {
            console.error('Failed to get user names.');
            reject(err);
        });
    });
};

exports.getUsers = function () {
    return new Promise(function(resolve, reject) {

        var userPromise = new Promise(function(resolve, reject) {
            const userQueryString = 'SELECT User.NickName, User.UserType, R1.Login ' +
                'FROM Register AS R1 ' +
                'LEFT JOIN User ON User.UserID = R1.UserID ' +
                'WHERE R1.Login = (SELECT MAX(R2.Login) ' +
                'FROM Register AS R2 ' +
                'WHERE R2.UserID = R1.UserID);';

            executeQuery(userQueryString).then(function (data) {
                resolve(data);
            }).catch(function (err) {
                console.error('Failed to get users.');
                reject(err);
            });
        });

        var birthdayPromise = new Promise(function(resolve, reject) {
            const daysToBirthdayQueryString = 'SELECT ' +
                'NickName, ' +
                'abs(IF(' +
                'right(curdate(), 5) >= right(DOB, 5), ' +
                'datediff(curdate(), ' +
                'concat(year(curdate() + INTERVAL 1 YEAR), ' +
                'right(DOB, 6))), ' +
                'datediff(concat(year(curdate()), ' +
                'right(DOB, 6)), ' +
                'curdate()))) ' +
                'AS DaysToBirthday ' +
                'FROM User ' +
                'ORDER BY DaysToBirthday;';

            executeQuery(daysToBirthdayQueryString).then(function (data) {
                resolve(data);
            }).catch(function (err) {
                console.error('Failed to get days to birthdays.' + err);
                reject(err);
            });
        });

        Promise.all([userPromise, birthdayPromise]).then(function (results) {
            results[0].forEach(function (user) {
                var result = results[1].filter(function( obj ) {
                    return obj.NickName === user.NickName;
                });
                user.daysToBirthday = result[0].DaysToBirthday;
            });
            resolve(results[0]);
        }).catch(function (err) {
            console.error("Failed to complete all promises when getting users.");
            reject(err);
        })
    });
};



function executeQuery(queryString) {
    return new Promise(function (resolve, reject) {
        pool.getConnection(function(err,connection){
            if (err) {
                console.error('Error in connection database');
                reject(err);
            }

            connection.on('error', function (err) {
                console.error('Error in connection database');
                reject(err);
            });

            connection.query(queryString, function (err, rows, fields) {
                if (!err) {
                    resolve(rows);
                    connection.release();
                } else {
                    console.error('Error while performing Query.');
                    connection.release();
                    reject(err);
                }
            });
        })
    });
}
