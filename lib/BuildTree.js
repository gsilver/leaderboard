class BuildTree {
  constructor(parent, id, name, dates, scores, issues) {

    this.id = id;
    this.name = name;
    if (parent === null) {
      this.path = name;
    } else {
      this.path = `${parent.path}:${name}`;
    }
    this.dates = dates;
    this.scores = scores;
    this.issues = issues;
    this.parent = parent;
    this.children = [];
  }

  // if a child has the same name, return it; otherwise return false
  hasChild(name) {
    let result = false;
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i].name === name) {
        result = this.children[i];
        break;
      }
    }
    return result;
  }

  // if a child has the same name, return it; otherwise add a new child and return it instead
  addChild(id, name, dates, scores, issues) {
    let childAt = this.hasChild(name);
    if (childAt === false) {
      const newNode = new BuildTree(this, id, name, dates, scores, issues);
      this.children.push(newNode);
      return newNode;
    } else {
      return childAt;
    }
  }

  // tally up issue counts
  calcIssueCountArray(dataArraySize) {
    let node = this;
    let sum = (this.issues = []);
    for (let j = 0; j < dataArraySize; j++) {
      sum[j] = {};
    }

    node.children.forEach(child => {
      if (child.issues === null) {
        child.calcIssueCountArray(dataArraySize);
      }
      for (let j = 0; j < dataArraySize; j++) {
        if (child.issues[j]) {
          for (let key in child.issues[j]) {
            if (key in sum[j]) {
              sum[j][key] = {
                violations:
                  sum[j][key].violations + child.issues[j][key].violations,
                pages: sum[j][key].pages + child.issues[j][key].pages
              };
            } else {
              sum[j][key] = {
                violations: child.issues[j][key].violations,
                pages: child.issues[j][key].pages
              };
            }
          }
        }
      }
    });

    let totals = [];
    for (let j = 0; j < dataArraySize; j++) {
      totals[j] = {};
      if (Object.keys(sum[j]).length > 0) {
        for (let key in sum[j]) {
          let evs = 0;
          let eps = 0;

          node.children.forEach(child => {
            if (key in child.issues[j]) {
              evs = evs + child.issues[j][key].violations;
              eps = eps + child.issues[j][key].pages;
            }
          });

          totals[j][key] = {
            violations: sum[j][key].violations + evs,
            pages: sum[j][key].pages + eps
          };
        }
      } else {
        totals[j] = null;
      }
    }

    this.issues = totals;
  }

  // populate score for each node and its children; uses arithmetic mean
  calcSummaryScoresArray (dataArraySize) {
    let node = this;
    let sum = [];

    node.children.forEach(child => {
      if (child.scores === null || child.children.length > 0) {
        child.calcSummaryScoresArray(dataArraySize);
      }

      // accumulate the total value for each data array position
      for (let p = 0; p < dataArraySize; p++) {
        if(child.scores[p] === 'N/A' || child.scores[p] === undefined) {
          sum[p] = 'N/A';
        } else {
          if(sum[p] === undefined) {
            sum[p] = 0 + child.scores[p];
          } else {
            sum[p] += child.scores[p];
          }
        }
      }
    });

    let average = [];

    for (let a = 0; a < dataArraySize; a++) {
      average[a] = sum[a] !== 'N/A' ? (sum[a] / node.children.filter(child => child.score !== 'N/A').length) : 0;
    }

    this.scores = average;
  }
}

class OrgTree extends BuildTree {
  constructor(parent, name, dates, scores, issues) {
    super(parent, name, dates, scores, issues);
  }

  parseAndAddLeaf(projectId, projectName, dates, scores, issues) {
    const orgArray = projectName.split(":");
    const depthBefore = orgArray.length - 1;
    const lastIndex = orgArray.length - 1;
    let parent = this;

    // add all nodes between root and current leaf
    for (let i = 0; i < depthBefore; i++) {
      parent = parent.addChild(projectId, orgArray[i], dates, scores, issues);
    }
    // add the actual leaf node and return it
    return parent.addChild(
      projectId,
      orgArray[lastIndex],
      dates,
      scores,
      issues
    );
  }
}

export default OrgTree;
