const request = require('request');
const urlAPI = 'http://zcash.flypool.org/api/miner_new/t1afdgdmPmjEJreiRhAKMm3uEUdS5tFuXM4';
const url ='https://zcash.flypool.org/miners/t1afdgdmPmjEJreiRhAKMm3uEUdS5tFuXM4';
const utils = require('./utils');
const xlsx = require('excel-export');
const fs = require('fs');
const later = require('later');
const download = require('./download');
const cheerio = require('cheerio');

/*
*每天9点从服务器拉取数据,计算前一天Zcash的收入存入数据库中，并且导出excel表格
*/
// later.date.localTime();//设置为本地时间
// var sched = later.parse.recur().on(9).hour().on(0).minute().on(0).second();
// let t = later.setInterval(pullAndExcel, sched);

(async function pullAndExcel(){
  let body = await new Promise(function(resolve,reject){
    request(urlAPI, function (error, response, body) {
        if (error || response.statusCode != 200) reject(error);
        else resolve(body);
      });
  });
 let payouts = JSON.parse(body).payouts;
 for(let i =0;i<payouts.length;i++){
  let query_payouts = utils.queryFormat('select * from payouts where payoutsid = ?',[payouts[i].id]);
  let result_payouts = await utils.P(utils.pool,'query',query_payouts);
  if(result_payouts.length == 0){
    let query = utils.queryFormat('insert into payouts set payoutsid = ?,day_eachtime_amount = ?,miner = ?,start = ?,end = ?,txhash = ?,paidon = ?',[payouts[i].id,payouts[i].amount,payouts[i].miner,payouts[i].start,payouts[i].end,payouts[i].txHash,new Date(payouts[i].paidOn).getTime()]);
    await utils.P(utils.pool,'query',query);
  }
}



 //从数据库中获取昨天天每次的Zcash收入，并求和，插入Zcashincome表
  const d = new Date();
  const time1 = new Date(d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()+' 00:00:00').getTime();//今天0点
  const time2 = time1-86400000;//昨天0点
  const time3 = time1-86400000*2;//前天0点
  let query = utils.queryFormat('select day_eachtime_amount from payouts where paidon > ? and paidon <= ?',[time2,time1]);//查询昨日一天的amount
  let result = await utils.P(utils.pool,'query',query);
  let day_amount = 0;//一天中zcash每次的数量的累加值
   for(let i =0;i<result.length;i++){
     day_amount += result[0].day_eachtime_amount;
   }


  let activeworker = await new Promise(function(resolve,reject){
    download(url, function(data) {
       if (data) {
         var $ = cheerio.load(data);
         var activeworker = $('#home > div:nth-child(4) > div:nth-child(3) > div > div.panel-body > h4').text();
         resolve(activeworker);
       }
       else reject('error');
     });
  })
   let the_day_before_yesterday_total_amount = 0;//直至前天为止已获取的Zcash数量
   let query2 = utils.queryFormat('select amount from zcashincome where date = ?',[time3]);
   let result2 = await utils.P(utils.pool,'query',query2);
   if(result2.length !=0) the_day_before_yesterday_total_amount = (result2[0].amount)/100000000;
   let date = time2;
   let payee = 'Zcash－flypool 矿池';
   let description = '挖币收入－矿厂';
   let income = day_amount/100000000;
   let outpay = 0;
   let amount =the_day_before_yesterday_total_amount+income;
   let avgHashrate = (JSON.parse(body).avgHashrate)/1000;
   let in_hashrate_ratio = income/avgHashrate;
   let query3 = utils.queryFormat('insert into zcashincome set payee=?,date=?,description=?,income=?,outpay=?,amount=?,activeworker=?,hashrate=?,in_hashrate_ratio=?',[payee,date,description,income,outpay,amount,activeworker,avgHashrate,in_hashrate_ratio])
   await utils.P(utils.pool,'query',query3);

   //导出excel表格
   let query4 ='select * from zcashincome';
   let data = await utils.P(utils.pool,'query',query4);

   let conf = {};
   const filename ='Zcash Account';
   conf.cols =[
    {caption:'Date(日期)', type:'string', width:30},
    {caption:'Payee(收支对象)', type:'string', width:30},
    {caption:'Description(项目明细描述)', type:'string', width:40},
    {caption:'In', type:'number', width:20},
    {caption:'Out', type:'number', width:20},
    {caption:'amount(具体数目)', type:'number', width:30},
    {caption:'Active worker(有效矿工)', type:'number', width:20},
    {caption:'Hashrate(算力 KH/s)', type:'number', width:30},
    {caption:'ZEC／Hashrate(产出算力比)', type:'number', width:30}
  ];
  let array = [];
  conf.rows = [];
  for(let i=0;i<data.length;i++){
    array[i] = [
          new Date(data[i].date).getFullYear()+'/'+ (new Date(data[i].date).getMonth()+1)+'/'+new Date(data[i].date).getDate(),
          data[i].payee,
          data[i].description,
          data[i].income,
          data[i].outpay,
          data[i].amount,
          data[i].activeworker,
          data[i].hashrate,
          data[i].in_hashrate_ratio
    ];
    conf.rows.push(array[i]);
  }
    let result_excel = xlsx.execute(conf);

    let  exceldate =d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate() ;

    let uploadDir = 'excel/';
    let filePath = uploadDir + filename + exceldate + ".xlsx";

    fs.writeFile(filePath, result_excel, 'binary',function(err){
        if(err){
            console.log(err);
        }
    });
}())
