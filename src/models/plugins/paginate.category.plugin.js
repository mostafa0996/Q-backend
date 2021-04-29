const { admin, company, master } = require("../../config/contant");
var multilanguageValues = 'title_';
const paginate = (schema) => {

  schema.statics.paginate = async function (filter, options, req) {

    const sort = {};
    if (options.sortBy) {
      const parts = options.sortBy.split(':');
      sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }
    options.page = Number(options.page) + 1;
    const limit = options.limit && parseInt(options.limit, 10) > 0 ? parseInt(options.limit, 10) : 10;
    const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const skip = (page - 1) * limit;


    var filters = {}
    if (filter.length > 0) {
      filters = {
        $and: filter,
      };
    }
    console.log(filter)
    var agrigateFilters = [];
    for (let k in filter) {
      agrigateFilters.push({ $match: filter[k] })
    }



    if (!req.user || (req.user.role !== admin && req.user.role !== company && req.user.role !== master)) {


      agrigateFilters.push({
        '$lookup': {
          from: 'categoriessubs',
          let: { category: "$_id" },
          as: 'SubCategories',
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$category", "$$category"] },
                    { $eq: ['$active', 1] }
                  ]

                }
              }
            }, {
              $project: {
                title: '$' + multilanguageValues + req.headers['accept-language'] ? '$' + multilanguageValues + req.headers['accept-language'] : '$' + multilanguageValues + 'en',
                note: '$note_' + req.headers['accept-language'] ? '$note_' + req.headers['accept-language'] : '$note_' + 'en',
                icon: 1, active: 1, other: 1, category: 1,
              }
            }
          ],
        }
      })

      agrigateFilters.push({ '$project': { title: '$title_' + req.headers['accept-language'] ? '$title_' + req.headers['accept-language'] : '$title_' + 'en', icon: 1, active: 1, weight: 1, price: 1, SubCategories: 1 } })



    } else {

      agrigateFilters.push({
        '$lookup': {
          from: 'categoriessubs',
          let: { category: "$_id" },
          as: 'SubCategories',
          pipeline: [
            { $match: { $expr: { $eq: ["$category", "$$category"] } } }
          ],
        }
      })

    }



    if (options.isPagination) {
      const countPromise = this.countDocuments(filters);
      const docsPromise = this.aggregate(agrigateFilters).skip(skip).limit(limit);


      return Promise.all([countPromise, docsPromise]).then((values) => {
        var [totalResults, results] = values;
        const totalPages = Math.ceil(totalResults / limit);
        const result = {
          results,
          page,
          limit,
          totalPages,
          totalResults,
        };
        return Promise.resolve(result);
      });
    } else {
      const countPromise = this.countDocuments(filters);
      var docsPromise;
      if (agrigateFilters.length !== 0)
        docsPromise = this.aggregate(agrigateFilters);
      else docsPromise = this.find(filters);


      return Promise.all([countPromise, docsPromise]).then((values) => {
        var [totalResults, results] = values;
        const result = {
          results,
          totalResults,
        };
        return Promise.resolve(result);
      });
    }



  };
};

module.exports = paginate;
