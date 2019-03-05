
/**
 * generateSchema
 * @param {object} response object
 * @return {array} array of paths found in the response
 */
function generateSchema(response) {
  const paths = []
  switch (typeof response) {
    case 'object':
      if (Array.isArray(response)) {
        response.forEach((inner) => {
          const childPaths = generateSchema(inner)
          childPaths.forEach((childPath) => {
            if (!paths.includes(childPath)) {
              paths.push(childPath)
            }
          })
        })
      } else {
        for (const key in response) {
          if (response.hasOwnProperty(key)) {
            if (!paths.includes(key)) {
              paths.push(key)
            }
            const childPaths = generateSchema(response[key])
            childPaths.forEach((childPath) => {
              if (!paths.includes(childPath)) {
                paths.push(key + '/' + childPath)
              }
            })
          }
        }
      }
      break
    case 'function':
      break
    default:
      break
  }
  return paths
}

module.exports.generateSchema = generateSchema
