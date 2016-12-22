const request = require('request');
const url = 'http://zcash.flypool.org/api/miner_new/t1afdgdmPmjEJreiRhAKMm3uEUdS5tFuXM4';
const utils = require('./utils');
const later = require('later');
/***
**每10钟从服务器上拉取payouts数据  主要有payoutsid 每次zcash数量  时间
*/
let flag = false;
let sched = later.parse.recur().every(10).minute();
let t = later.setInterval(pull, sched);

async function pull(){
  if(flag) return;
  flag = true;
  let body = await new Promise(function(resolve,reject){
    request(url, function (error, response, body) {
        if (error || response.statusCode != 200) reject(error);
        else resolve(body);
      });
  });
 let payouts = JSON.parse(body).payouts;
 for(let i =0;i<payouts.length;i++){
  let query = utils.queryFormat('select * from payouts where payoutsid = ?',[payouts[i].id]);
  let result = await utils.P(utils.pool,'query',query);
  if(result.length == 0){
    let query = utils.queryFormat('insert into payouts set payoutsid = ?,day_eachtime_amount = ?,miner = ?,start = ?,end = ?,txhash = ?,paidon = ?',[payouts[i].id,payouts[i].amount,payouts[i].miner,payouts[i].start,payouts[i].end,payouts[i].txHash,new Date(payouts[i].paidOn).getTime()]);
    await utils.P(utils.pool,'query',query);
  }
 }
 flag = false;
};
