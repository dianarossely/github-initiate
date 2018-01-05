var async = require('async'),
	collections = null;

function _embedReferences(data, include, callback) {
	var items = [],
		mdata = null;
	
	//data can be send as single object or array of object
	//so need to handle it
	if (Array.isArray(data)) {
		mdata = [];
		items = data;		
	} else {
		items.push(data);
	}

	/** old code
	//go through each data				
	async.each(items, function (item, callback) {
		var curr = item.toObject();
		
		//go through each include
		async.each(include, function (item, callback) {
			if (item.field !== undefined && item.ref !== undefined) {
				var field = item.field,
					ref = item.ref;
				
				//check if include field is valid or not
				if (curr[field] !== undefined) {
					var inVal = [],
						refSchema = collections[ref],
						RefCollection = require('../models/collection')(ref, refSchema);
					
					//include field may present as single or multiple references
					if (Array.isArray(curr[field])) {
						inVal = curr[field];
					} else {
						inVal.push(curr[field]);
					}
					
					//find all references base on _id value
					RefCollection.find({ _id: { $in: inVal } }, function (error, results) {
						if (!error) {						
							if (Array.isArray(curr[field])) {
								curr[field] = results;
							} else {
								if (results.length > 0) {
									curr[field] = results[0];
								} else {
									curr[field] = null;
								}
							}	
						}									
						
						callback();
					});
				} else {
					callback();
				}
			} else {
				callback();
			}			
		}, function (error) {
			//finally include each
			if (mdata !== null) {
				mdata.push(curr);
			} else {
				mdata = curr;
			}
			
			callback();
		});
	}, function (error) {
		//finally data each
		callback(null, mdata);
	});
	**/

	async.waterfall([
		function (callback) {
			var queryRefs = [];

			for (var i = 0; i < include.length; i++) {
				var field = include[i].field,
					ref = include[i].ref;

				if (field !== undefined && ref !== undefined) {
					var $in = [];

					for (var j = 0; j < items.length; j++) {
						var curr = items[j].toObject();

						if (curr[field] !== undefined && curr[field] !== null) {
							if (Array.isArray(curr[field])) {
								$in = $in.concat(curr[field]);
							} else {
								$in.push(curr[field]);
							}	
						}
					}

					queryRefs.push({
						field: field,
						ref: ref,
						$in: $in
					});
				}
			}

			callback(null, queryRefs);
		},

		function (queryRefs, callback) {
			var refData = {};

			async.each(queryRefs, function (item, callback) {
				var refSchema = collections[item.ref],
					RefCollection = require('../models/collection')(item.ref, refSchema);

				RefCollection.find({ _id: { $in: item.$in } }, function (error, results) {
					if (!error) {
						refData[item.field] = results;
					}

					callback(error);
				});
			}, function (error) {
				callback(null, refData);
			});
		},

		function (refData, callback) {
			var _ = require('underscore'),
				refDataKeys = _.keys(refData);

			for (var i = 0; i < items.length; i++) {
				var curr = items[i].toObject();

				for (var j = 0; j < refDataKeys.length; j++) {
					var field = refDataKeys[j];

					var filter = _.filter(refData[field], function (data) {
						if (Array.isArray(curr[field])) {
							var idx = curr[field].indexOf(data._id);
							if (idx !== -1) {
								return true;
							} else {
								return false;
							}
						} else {
							return curr[field] === data._id;
						}
					});

					if (Array.isArray(curr[field])) {
						curr[field] = filter;
					} else {
						if (filter.length > 0) {
							curr[field] = filter[0];
						} else {
							curr[field] = null;
						}
					}

					if (mdata !== null) {
						mdata.push(curr);
					} else {
						mdata = curr;
					}
				}
			}

			callback();
		}
	], function (error) {
		//finally data each
		callback(null, mdata);
	});
}

function _removeReferences(data, remove, callback) {
	var items = [];
	
	//data can be send as single object or array of object
	//so need to handle it
	if (Array.isArray(data)) {
		items = data;		
	} else {
		items.push(data);
	}
	
	//go through each data				
	async.each(items, function (item, callback) {
		var curr = item;
		
		//go through each remove
		async.each(remove, function (item, callback) {
			if (item.field !== undefined && item.ref !== undefined) {
				var field = item.field,
					ref = item.ref,
					perma = item.perma;
				
				var refSchema = collections[ref],
					RefCollection = require('../models/collection')(ref, refSchema);
				
				var queryOption = {};
				queryOption[field] = curr._id;
				
				RefCollection.find(queryOption, function (error, results) {
					if (!error) {
						async.each(results, function (item, callback) {
							if (Array.isArray(item[field])) {
								for (var i = 0; i < item[field].length; i++) {
									if (item[field][i].toString() === curr._id.toString()) {
										item[field].splice(i, 1);
										break;
									}
								}
							} else {
								item[field] = null;
							}
							
							if (perma !== undefined && perma === true) {
								item.remove(function (error) {
									callback();
								});
							} else {
								item.save(function (error) {
									callback();
								});
							}						
						}, function (error) {
							callback(error);
						});
					} else {
						callback();
					}
				});
			} else {
				callback();
			}						
		}, function (error) {
			//finally remove each			
			callback();
		});
	}, function (error) {
		//finally data each
		callback(null, data);
	});
}

module.exports = {
	isExist: function (req, res, name) {
		if (collections === null) {
			collections = req.collections;
		}

		if (name in collections) {
			return true;
		} else {
			return false;
		}
	},
	
	index: function(req, res) {
		if (collections === null) {
			collections = req.collections;
		}

		var collectionList = [];
		
		for (var key in collections) {
			collectionList.push(key);	
		}
		
		res.status(200).json({
			status: 200,
			success: true,
			data: collectionList
		});
	},
	
	all: function(req, res) {
		if (collections === null) {
			collections = req.collections;
		}

		var collectionName = req.params.name,
			collectionSchema = collections[collectionName],
			Collection = require('../models/collection')(collectionName, collectionSchema);						
		
		async.waterfall([
			// execute before hook if any
			function (callback) {
				if (req.hooks.collections.before.all[collectionName] !== undefined) {
					req.hooks.collections.before.all[collectionName](req, res, callback);
				} else {
					callback();
				}
			},

			// find all and filter by condition in query parameter where if any
			function (callback) {
				req.query._params.where = req.query._params.where || {};

				if (req.query._params.select) {
					Collection.find(req.query._params.where).select(req.query._params.select).exec(callback);
				} else {
					Collection.find(req.query._params.where, callback);
				}
			},
			
			// include all references base on query parameter include
			function (results, callback) {				
				if (results.length > 0 && req.query._params.embed !== undefined && req.query._params.embed.length > 0) {
					_embedReferences(results, req.query._params.embed, callback);
				} else {
					callback(null, results);
				}
			}
		], function (error, results) {
			// finally
			if (!error) {
				// execute after hook if any
				if (req.hooks.collections.after.all[collectionName] !== undefined) {
					req.hooks.collections.after.all[collectionName](req, res, results);
				} else {
					res.status(200).json({
						status: 200,
						success: true,
						data: results
					});	
				}				
			} else {
				res.status(400).json({
					status: 400,
					success: false,
					error: error
				});
			}
		});
	},
	
	get: function(req, res) {
		if (collections === null) {
			collections = req.collections;
		}

		var collectionName = req.params.name,
			collectionSchema = collections[collectionName],
			collectionId = req.params.id,
			Collection = require('../models/collection')(collectionName, collectionSchema);					
		
		async.waterfall([
			// execute before hook if any
			function (callback) {
				if (req.hooks.collections.before.get[collectionName] !== undefined) {
					req.hooks.collections.before.get[collectionName](req, res, callback);
				} else {
					callback();
				}
			},

			// find collection by id
			function (callback) {
				Collection.findById(collectionId, function(error, collection) {
					if (!error) {
						if (collection !== null) {
							callback(null, collection);
						} else {
							callback('Unable to find.');
						}
					} else {
						callback(error);
					}
				});
			},

			// embed references if any
			function (collection, callback) {
				if (req.query._params !== undefined && req.query._params.embed !== undefined && req.query._params.embed.length > 0) {
					_embedReferences(collection, req.query._params.embed, callback);
				} else {
					callback(null, collection);
				}
			}
		], function(error, collection) {
			// finally
			if (!error) {
				// execute after hook if any
				if (req.hooks.collections.after.get[collectionName] !== undefined) {
					req.hooks.collections.after.get[collectionName](req, res, collection);
				} else {
					res.status(200).json({
						status: 200,
						success: true,
						data: collection
					});	
				}
			} else {
				res.status(400).json({
					status: 400,
					success: false,
					error: error
				});
			}
		});					
	},
	
	post: function(req, res) {
		if (collections === null) {
			collections = req.collections;
		}

		var collectionName = req.params.name,
			collectionSchema = collections[collectionName],
			collectionData = req.body,
			Collection = require('../models/collection')(collectionName, collectionSchema);
			
		collectionData.createdAt = new Date();
		collectionData.updatedAt = new Date();

		async.waterfall([
			// execute before hook if any
			function (callback) {
				if (req.hooks.collections.before.post[collectionName] !== undefined) {
					req.hooks.collections.before.post[collectionName](req, res, callback);
				} else {
					callback();
				}
			},

			// create collection
			function (callback) {
				Collection.create(collectionData, function(error, collection) {
					callback(error, collection);
				});
			},

			// embed references if any
			function (collection, callback) {
				if (req.query._params !== undefined && req.query._params.embed !== undefined && req.query._params.embed.length > 0) {
					_embedReferences(collection, req.query._params.embed, callback);
				} else {
					callback(null, collection);
				}
			}
		], function(error, collection) {
			// finally
			if (!error) {
				// execute after hook if any
				if (req.hooks.collections.after.post[collectionName] !== undefined) {
					req.hooks.collections.after.post[collectionName](req, res, collection);
				} else {
					res.status(200).json({
						status: 200,
						success: true,
						data: collection
					});	
				}
			} else {
				res.status(400).json({
					status: 400,
					success: false,
					error: error
				});
			}
		});
	},
	
	put: function(req, res) {
		if (collections === null) {
			collections = req.collections;
		}

		var collectionName = req.params.name,
			collectionSchema = collections[collectionName],
			collectionId = req.params.id,
			collectionData = req.body,
			Collection = require('../models/collection')(collectionName, collectionSchema);
			
		collectionData.updatedAt = new Date();

		async.waterfall([
			// execute before hook if any
			function (callback) {
				if (req.hooks.collections.before.put[collectionName] !== undefined) {
					req.hooks.collections.before.put[collectionName](req, res, callback);
				} else {
					callback();
				}
			},

			// update collection
			function (callback) {
				Collection.findByIdAndUpdate(collectionId, collectionData, function(error, collection) {
					if (!error) {
						if (collection !== null) {
							// callback(null, collection);
							callback();
						} else {
							callback('Unable to find and update.');
						}
					} else {
						callback(error);
					}
				});	
			},

			// manual update colletion data
			// function(collection, callback) {
			// 	//need to update manualy since mongoose return the one before update
			// 	for (var key in collectionData) {
			// 		if (collection[key] !== undefined) {
			// 			collection[key] = collectionData[key];
			// 		}	
			// 	}

			// 	callback(null, collection);
			// },

			// find collection by id
			function (callback) {
				Collection.findById(collectionId, function(error, collection) {
					if (!error) {
						if (collection !== null) {
							callback(null, collection);
						} else {
							callback('Unable to find.');
						}
					} else {
						callback(error);
					}
				});
			},

			// embed references if any
			function (collection, callback) {
				if (req.query._params !== undefined && req.query._params.embed !== undefined && req.query._params.embed.length > 0) {
					_embedReferences(collection, req.query._params.embed, callback);
				} else {
					callback(null, collection);
				}
			}
		], function(error, collection) {
			// finally
			if (!error) {
				// execute after hook if any
				if (req.hooks.collections.after.put[collectionName] !== undefined) {
					req.hooks.collections.after.put[collectionName](req, res, collection);
				} else {
					res.status(200).json({
						status: 200,
						success: true,
						data: collection
					});	
				}
			} else {
				res.status(400).json({
					status: 400,
					success: false,
					error: error
				});
			}
		});				
	},
	
	delete: function(req, res) {
		if (collections === null) {
			collections = req.collections;
		}
		
		var collectionName = req.params.name,
			collectionSchema = collections[collectionName],
			collectionId = req.params.id,
			Collection = require('../models/collection')(collectionName, collectionSchema);
		
		async.waterfall([
			// execute before hook if any
			function (callback) {
				if (req.hooks.collections.before.delete[collectionName] !== undefined) {
					req.hooks.collections.before.delete[collectionName](req, res, callback);
				} else {
					callback();
				}
			},

			// delete collection
			function (callback) {
				Collection.findByIdAndRemove(collectionId, function(error, collection) {
					if (!error) {
						if (collection !== null) {
							callback(null, collection);
						} else {
							callback('Unable to find and delete.');
						}
					} else {
						callback(error);
					}
				});
			},

			// embed references if any
			function (collection, callback) {
				if (req.query._params !== undefined && req.query._params.embed !== undefined && req.query._params.embed.length > 0) {
					_embedReferences(collection, req.query._params.embed, callback);
				} else {
					callback(null, collection);
				}
			},

			// remove references if any
			function (collection, callback) {
				if (req.query._params !== undefined && req.query._params.remove !== undefined && req.query._params.remove.length > 0) {
					_removeReferences(collection, req.query._params.remove, callback);
				} else {
					callback(null, collection);
				}
			}
		], function(error, collection) {
			// finally
			if (!error) {
				// execute after hook if any
				if (req.hooks.collections.after.delete[collectionName] !== undefined) {
					req.hooks.collections.after.delete[collectionName](req, res, collection);
				} else {
					res.status(200).json({
						status: 200,
						success: true,
						data: collection
					});	
				}
			} else {
				res.status(400).json({
					status: 400,
					success: false,
					error: error
				});
			}
		});
	}
};