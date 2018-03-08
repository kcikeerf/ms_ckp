var Rds = require('../../models/rds');
// var Ckp = require('../../models/ckp');
var rds = new Rds();
// var ckp = new Ckp.Ckp();
var CheckPoint = require('../../models/check_point');
var Q = require('q');
var defer = Q.defer();
var MsCkpConfig = require('../../models/ms_ckp_config');
var ms_ckp_config = new MsCkpConfig();
var BankRid = require('../../models/bank_rid');
var pad_left = require('pad-left');

const { check, validationResult } = require('express-validator/check');
const { matchedData, sanitize } = require('express-validator/filter');

var express = require('express');
var router = express.Router();

//创建指标
router.post('/', [
		// check("uid").exists(),//检查指标uid
		check("dimesion").exists(), //检查指标维度
		// check("rid").exists(),//检查指标uid
		check("subject").exists(), //检查指标体系科目
		check("category").exists(), //检查指标体系学段
		check("str_pid").exists(), //检查父节点id
		check("checkpoint").exists(), //检查指标体系学段
		check("advice").exists(), //检查指标建议
		check("desc").exists(), //检查指标描述
		check("weights").exists(), //检查指标体系学段
		// check("sort").exists(), //检查指标排序
		check("high_level").exists(), //检查指标是否高阶
		check("checkpoint_system_rid").exists(), //检查指标体系rid
		check("is_entity").exists() //检查指标是否末级
	], (req,res,next) => {
		//参数异常处理
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ message: errors.mapped() });
		};		
		var item = req.body;
		var new_rid = ckp.get_max_rid(item);
		//插入SQL文
		var sql_str = "INSERT INTO bank_subject_checkpoint_ckps " +
			" (uid,dimesion, rid, subject, category, checkpoint, advice, `desc`, weights, sort, high_level, checkpoint_system_rid, is_entity) " +
			" VALUES (" +
			"'" + (item.uid || "") + "'," +
			"'" + (item.dimesion || "") + "'," +
			"'" + (item.rid || "999") + "'," +
			"'" + (item.subject || "") + "'," +
			"'" + (item.category || "") + "'," +
			"'" + (item.checkpoint || "") + "'," +
			"'" + (item.advice || "") + "'," +
			"'" + (item.desc || "") + "'," +
			(item.weights || 1) + "," +
			"'" + (item.sort || "999") + "'," +
			(item.high_level || 0) + "," +
			"'" + (item.checkpoint_system_rid || "") + "'," +
			(item.is_entity || 0) +
			") ;";

		//插入新指标
		rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.INSERT }).spread((results,metadata) => {
			res.status(201);
			res.send({msg: "Success!"})
		}).catch(function (err){
			res.status(500);
			res.send({msg: "Failed!"});
		});
});

//获取指标列表
router.get('/list', [
		check("checkpoint_system_rid").exists(), //检查指标体系rid
		check("subject").exists(), //检查指标体系科目
		check("category").exists() //检查指标体系学段
	], (req,res,next) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ message: errors.mapped() });
		};
		var res_data = {
			"knowledge": [],
			"skill":[],
			"ability":[]
		};
		var base_sql_str = "SELECT * FROM bank_subject_checkpoint_ckps " + 
				" WHERE deleted_at IS NULL and " + 
				" checkpoint_system_rid='" + req.query.checkpoint_system_rid + "' and " +
				" subject='" + req.query.subject + "' and " +
				" category='" + req.query.category + "' and ";
		var knowledge_sql_str = base_sql_str + " dimesion='knowledge' ;";
		var skill_sql_str = base_sql_str + " dimesion='skill' ;";
		var ability_sql_str = base_sql_str + " dimesion='ability' ;";

		var knowledge_obj = {
			"pid":"",
			"nodes": [
				{
					"dimesion": "knowledge",
					"name": "知识",
					"nocheck": 1,
					"open": true,
					"pid": "",
					"rid": ""
				}
			]
		};
		var skill_obj = {
			"pid":"",
			"nodes": [
				{
					"dimesion": "skill",
					"name": "技能",
					"nocheck": 1,
					"open": true,
					"pid": "",
					"rid": ""
				}
			]
		};
		var ability_obj = {
			"pid":"",
			"nodes": [
				{
					"dimesion": "ability",
					"name": "能力",
					"nocheck": 1,
					"open": true,
					"pid": "",
					"rid": ""
				}
			]
		};		

		//获取知识nodes
		rds.sequelize.query(knowledge_sql_str,{ type: rds.sequelize.QueryTypes.SELECT }).then(items => {
			knowledge_obj.nodes = knowledge_obj.nodes.concat(items.map(x => ckp.construct_ckp_node(x)));
			//获取技能nodes
			rds.sequelize.query(skill_sql_str,{ type: rds.sequelize.QueryTypes.SELECT }).then(items => {
				skill_obj.nodes = skill_obj.nodes.concat(items.map(x => ckp.construct_ckp_node(x)));
				//获取能力nodes
				rds.sequelize.query(ability_sql_str,{ type: rds.sequelize.QueryTypes.SELECT }).then(items => {
					ability_obj.nodes = ability_obj.nodes.concat(items.map(x => ckp.construct_ckp_node(x)));
					res.send({"knowledge": knowledge_obj, "skill": skill_obj, "ability": ability_obj});
				});

			});
		});
});

//获取指标详情
router.get('/:uid',[
		check("uid").exists()//检查指标uid
	], (req,res,next) => {
		//参数异常处理
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ message: errors.mapped() });
		};

		var item = req.params;
		var sql_str = "SELECT * FROM bank_subject_checkpoint_ckps WHERE uid='" + item.uid + "';" ;

		//查找指标
		rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.SELECT }).spread((results,metadata) => {
			res.status(200);
			console.log(results);
			res.send(results)
		}).catch(function (err){
			res.status(500);
			res.send({msg: "Failed!"});
		});
});

//更新指标
router.put('/:uid',[
		check("uid").exists()//检查指标uid
	], (req,res,next) => {
		//参数异常处理
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ message: errors.mapped() });
		};

		var item = req.body;
		var new_rid = ckp.get_new_rid(item);
		//插入SQL文
		var sql_str = "UPDATE bank_subject_checkpoint_ckps SET ";
		var sql_set_arr = [];

		item.dimesion && sql_set_arr.push(" dimesion= '" + item.dimesion + "'");
		item.rid && sql_set_arr.push(" rid= '" + item.rid + "'");
		item.subject && sql_set_arr.push(" subject= '" + item.subject + "'");
		item.category && sql_set_arr.push(" category= '" + item.category + "'");
		item.checkpoint && sql_set_arr.push(" checkpoint= '" + item.checkpoint + "'");
		item.advice && sql_set_arr.push(" advice= '" + item.advice + "'");
		item.desc && sql_set_arr.push(" `desc`= '" + item.desc + "'");
		item.weights && sql_set_arr.push(" weights= '" + item.weights + "'");
		item.sort && sql_set_arr.push(" sort= '" + item.sort + "'");
		item.high_level && sql_set_arr.push(" high_level= '" + item.high_level + "'");
		item.checkpoint_system_rid && sql_set_arr.push(" checkpoint_system_rid= '" + item.checkpoint_system_rid + "'");
		item.is_entity && sql_set_arr.push(" is_entity= '" + item.is_entity + "'");

		sql_str += sql_set_arr.join(",");
		sql_str += "WHERE uid='" + item.uid + "';"

		//插入新指标
		rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.UPDATE }).spread((results,metadata) => {
			res.status(200);
			res.send({msg: "Success!"})
		}).catch(function (err){
			res.status(500);
			res.send({msg: "Failed!"});
		});
});

//移动指标
router.post('/move_inner',[
		check("from_uid").exists(),//检查指标移动目标uid
		check("to_uid").exists()//检查移动指标的uid		
	], (req,res,next) => {
		//参数异常处理
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ message: errors.mapped() });
		};

		var params = req.body;
		var res_json = {msg: "Success!"}
		res.status(201);

		//查找指标
		var from_ckp = null;
		var to_ckp = null;
		var from_parent = null;
		var from_ckp_new_rid = null;

		CheckPoint.findOne({attributes: { exclude: ['createdAt', 'updatedAt']}, where: {uid: params.from_uid}}).then(result => {
			from_ckp = result;
			from_ckp.parent().then(result => {
				from_parent = result;
				CheckPoint.findOne({attributes: { exclude: ['createdAt', 'updatedAt']}, where: {uid: params.to_uid}}).then(result => {
					to_ckp = result;
					//根据父节点获取新的rid
					CheckPoint.get_max_rid(from_ckp, to_ckp).then(result => {
						max_rid = result[0].max_rid;
						if(max_rid){
							from_ckp_new_rid = ( parseInt(max_rid, 36) + 1 ).toString(36);
							from_ckp_new_rid_length = (from_ckp_new_rid.length%ms_ckp_config.ckpStep ==0 ) ? from_ckp_new_rid.length : parseInt(from_ckp_new_rid.length/ms_ckp_config.ckpStep+1)*ms_ckp_config.ckpStep;
							from_ckp_new_rid = pad_left(from_ckp_new_rid, from_ckp_new_rid_length, '0');
						} else {
							from_ckp_new_rid = to_ckp.rid + "000";
						}

						var sql_str = "";
						var from_ckp_rid_length = from_ckp.rid.length;
						//获取自己以及子孙节点
						from_ckp.myNodes().then(items => {
							var node_new_rid = "";
							items.forEach(function(node){
								node_rid_length = node.rid.length;
								suffix_node_rid = node.rid.slice(from_ckp_rid_length, node_rid_length);
								node_new_rid = from_ckp_new_rid + suffix_node_rid;
								sql_str += "SET @newRid = '" + node_new_rid + "'; SET @nodeUid = '" + node.uid  + "' ; UPDATE bank_subject_checkpoint_ckps SET rid=@newRid WHERE uid=@nodeUid;";
							});
							rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.BULKUPDATE }).then(items => {
								sql_str = "";
								if(to_ckp && to_ckp.is_entity){
									sql_str += "SET @isEntity = false; SET @nodeUid = '" + to_ckp.uid  + "' ; UPDATE bank_subject_checkpoint_ckps SET is_entity=@isEntity WHERE uid=@nodeUid;"; 
								}
								if(from_parent){
									from_parent.myNodes().then(items => {
										if(items.length == 1){
											sql_str += "SET @isEntity = true; SET @nodeUid = '" + from_parent.uid  + "' ; UPDATE bank_subject_checkpoint_ckps SET is_entity=@isEntity WHERE uid=@nodeUid;"; 
										}
										if(sql_str){
											rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.RAW }).then(items => {
												res.send(res_json);
											});
										} else {
											res.send(res_json);
										}
									});
								} else if (sql_str.length != 0){
									rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.RAW }).then(items => {
										res.send(res_json);
									});
								} else {
									res.send(res_json)
								}

							});
						});

					});	

				})

			})
		}).catch(function (err){
			res.status(500);
			res.send({msg: err});
		});
	});


//移动指标
router.post('/move_prev',[
		check("from_uid").exists(),//检查指标移动目标uid
		check("to_uid").exists()//检查移动指标的uid		
	], (req,res,next) => {
		//参数异常处理
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ message: errors.mapped() });
		};

		var params = req.body;
		var res_json = { msg: "Success!" }
		res.status(201);

		//查找指标
		var from_ckp = null;
		var to_ckp = null;
		var from_parent = null;
		var to_parent = null;
		var from_ckp_new_rid = null;
		var impact_nodes = [];
		var impact_exclude_node = null;
		CheckPoint.findOne({attributes: { exclude: ['createdAt', 'updatedAt']}, where: {uid: params.from_uid}}).then(result => {
			from_ckp = result;
			from_ckp.parent().then(result => {
				from_parent = result;
				CheckPoint.findOne({attributes: { exclude: ['createdAt', 'updatedAt']}, where: {uid: params.to_uid}}).then(result => {
					to_ckp = result;
					to_ckp.parent().then(result => {
						to_parent = result;
						from_ckp_new_rid = to_ckp.rid
						if(from_parent && to_parent &&(from_parent.uid == to_parent.uid)){
							impact_exclude_node = from_ckp;
						}
						//获取影响范围
						to_ckp.impactNodes(impact_exclude_node).then(items => {
							//获取自己以及子孙节点
							from_ckp.myNodes().then(from_ckp_families => {
								//更新影响范围
								CheckPoint.change_impacted_nodes(items, to_parent, "down").then(x => {
									var sql_str = "";
									var from_ckp_rid_length = from_ckp.rid.length;
									var node_new_rid = "";
									from_ckp_families.forEach(function(node){
										node_rid_length = node.rid.length;
										suffix_node_rid = node.rid.slice(from_ckp_rid_length, node_rid_length);
										node_new_rid = from_ckp_new_rid + suffix_node_rid;
										sql_str += "SET @newRid = '" + node_new_rid + "'; SET @nodeUid = '" + node.uid  + "' ; UPDATE bank_subject_checkpoint_ckps SET rid=@newRid WHERE uid=@nodeUid;";
									});
									rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.BULKUPDATE }).then(items => {
										sql_str = "";
										if(to_parent && to_parent.is_entity){
											sql_str += "SET @isEntity = false; SET @nodeUid = '" + to_parent.uid  + "' ; UPDATE bank_subject_checkpoint_ckps SET is_entity=@isEntity WHERE uid=@nodeUid;"; 
										}
										if(from_parent){
											from_parent.myNodes().then(items => {
												if(items.length == 1){
													sql_str += "SET @isEntity = true; SET @nodeUid = '" + from_parent.uid  + "' ; UPDATE bank_subject_checkpoint_ckps SET is_entity=@isEntity WHERE uid=@nodeUid;"; 
												}
												if(sql_str){
													rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.RAW }).then(items => {
														res.send(res_json);
													});
												} else {
													res.send(res_json);
												}
											});
										} else if (sql_str.length != 0){
											rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.RAW }).then(items => {
												res.send(res_json);
											});
										} else {
											res.send(res_json)
										}

									});

								})

							});

						});
					})
				})

			})
		}).catch(function (err){
			res.status(500);
			res.send({msg: err});
		});
	});

//移动指标
router.post('/move_next',[
		check("from_uid").exists(),//检查指标移动目标uid
		check("to_uid").exists()//检查移动指标的uid		
	], (req,res,next) => {
		//参数异常处理
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ message: errors.mapped() });
		};

		var params = req.body;
		var res_json = { msg: "Success!" }
		res.status(201);

		//查找指标
		var from_ckp = null;
		var to_ckp = null;
		var from_parent = null;
		var to_parent = null;
		var from_ckp_new_rid = null;
		var impact_nodes = [];
		var impact_exclude_node = null;
		CheckPoint.findOne({attributes: { exclude: ['createdAt', 'updatedAt']}, where: {uid: params.from_uid}}).then(result => {
			from_ckp = result;
			//查看操作指标的父节点
			from_ckp.parent().then(result => {
				from_parent = result;
				CheckPoint.findOne({attributes: { exclude: ['createdAt', 'updatedAt']}, where: {uid: params.to_uid}}).then(result => {
					to_ckp = result || new CheckPoint();
					//查找目标的父节点
					to_ckp.parent().then(result => {
						to_parent = result;
						//查找目标指标的下一个指标节点
						to_ckp.nextNode().then(nextNodes =>{
							var nextNode = new CheckPoint(nextNodes[0]);
							//根据父节点获取新的rid
							CheckPoint.get_max_rid(from_ckp, to_parent).then(result => {
								var no_next_new_rid = "";
								max_rid = result[0].max_rid;
								if(max_rid){
									no_next_new_rid = ( parseInt(max_rid, 36) + 1 ).toString(36);
									no_next_new_rid_length = (no_next_new_rid.length%ms_ckp_config.ckpStep ==0 ) ? no_next_new_rid.length : parseInt(no_next_new_rid.length/ms_ckp_config.ckpStep+1)*ms_ckp_config.ckpStep;
									console.log("no_next_new_rid,no_next_new_rid_length:" + no_next_new_rid +","+ no_next_new_rid_length);
									no_next_new_rid = pad_left(no_next_new_rid, no_next_new_rid_length, '0');
								}
								from_ckp_new_rid = (nextNode && nextNode.uid) ? nextNode.rid : no_next_new_rid;

								if(from_parent && to_parent &&(from_parent.uid == to_parent.uid)){
									impact_exclude_node = from_ckp;
								}

								//获取影响范围
								nextNode.impactNodes(impact_exclude_node).then(items => {
									//获取自己以及子孙节点
									from_ckp.myNodes().then(from_ckp_families => {
										//更新影响范围
										CheckPoint.change_impacted_nodes((items||[]), to_parent, "down").then(x => {
											var sql_str = "";
											var from_ckp_rid_length = from_ckp.rid.length;
											var node_new_rid = "";
											from_ckp_families.forEach(function(node){
												node_rid_length = node.rid.length;
												suffix_node_rid = node.rid.slice(from_ckp_rid_length, node_rid_length);
												console.log("from_ckp_new_rid,suffix_node_rid:" + from_ckp_new_rid + "," + suffix_node_rid);
												node_new_rid = from_ckp_new_rid + suffix_node_rid;
												sql_str += "SET @newRid = '" + node_new_rid + "'; SET @nodeUid = '" + node.uid  + "' ; UPDATE bank_subject_checkpoint_ckps SET rid=@newRid WHERE uid=@nodeUid;";
											});
											rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.BULKUPDATE }).then(items => {
												sql_str = "";
												if(to_parent && to_parent.is_entity){
													sql_str += "SET @isEntity = false; SET @nodeUid = '" + to_parent.uid  + "' ; UPDATE bank_subject_checkpoint_ckps SET is_entity=@isEntity WHERE uid=@nodeUid;"; 
												}
												if(from_parent){
													from_parent.myNodes().then(items => {
														if(items.length == 1){
															sql_str += "SET @isEntity = true; SET @nodeUid = '" + from_parent.uid  + "' ; UPDATE bank_subject_checkpoint_ckps SET is_entity=@isEntity WHERE uid=@nodeUid;"; 
														}
														if(sql_str){
															rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.RAW }).then(items => {
																res.send(res_json);
															});
														} else {
															res.send(res_json);
														}
													});
												} else if (sql_str.length != 0){
													rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.RAW }).then(items => {
														res.send(res_json);
													});
												} else {
													res.send(res_json)
												}

											});

										})

									});

								});


							});	

						});


					})
				})

			})
		}).catch(function (err){
			res.status(500);
			res.send({msg: err});
		});
	});

//删除指标
router.delete('/:uid',[
		check("uid").exists()//检查指标uid
	], (req,res,next) => {
		//参数异常处理
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ message: errors.mapped() });
		};

		var item = req.params;
		var sql_str = "UPDATE bank_subject_checkpoint_ckps SET deleted_at=CURRENT_TIMESTAMP WHERE uid='" + item.uid + "';" ;

		//查找指标
		rds.sequelize.query(sql_str,{ type: rds.sequelize.QueryTypes.DELETE }).then(items => {
			res.status(200);
			res.send({msg: "Success!"})
		}).catch(function (err){
			res.status(500);
			res.send({msg: err});
		});
});

//获取父节点
router.get('/:uid/parent',[
		check("uid").exists()//检查指标uid		
	], (req,res,next) => {
		//参数异常处理
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ message: errors.mapped() });
		};

		var item = req.params;

		//查找指标
		CheckPoint.findOne({attributes: { exclude: ['createdAt', 'updatedAt']}, where: {uid: item.uid}}).then(item => {
			item.parent().then(parent => {res.send(parent);});
		}).catch(function (err){
			res.status(500);
			res.send({msg: err});
		});
});

//获取所有子节点
router.get('/:uid/myNodes',[
		check("uid").exists()//检查指标uid		
	], (req,res,next) => {
		//参数异常处理
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(422).json({ message: errors.mapped() });
		};

		var item = req.params;

		//查找指标
		CheckPoint.findOne({attributes: { exclude: ['createdAt', 'updatedAt']}, where: {uid: item.uid}}).then(item => {
			item.myNodes().then(childs => {res.send(childs);});
		}).catch(function (err){
			res.status(500);
			res.send({msg: err});
		});
});

module.exports = router;
