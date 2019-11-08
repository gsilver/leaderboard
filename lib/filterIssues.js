/**
 * accepts issueslist from results
 * then organizes the total counts for each group
 * then returns the new object
 */

export default (issuelist) => {
  
  const issues = {};
 
  return issuelist.reduce((acc, item) => {
    const { issuegrouping, issues, pages } = item;
    if (!acc[issuegrouping]) {
      acc[issuegrouping] = {
        violations: 0,
        pages: 0
      };
    }
    
    acc[issuegrouping].violations += issues;
    acc[issuegrouping].pages += pages;
    return acc;
  }, issues);
};