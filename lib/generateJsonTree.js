import BuildTree from './BuildTree';
import writeFile from './writeFile';
import reorderDataJson from './reorderDataJson';

export default async (config, data, timeline, log) => {
  return new Promise((resolve, reject) => {
    const crData = [];
    let uniques = [];
    data.forEach((org) => {
      uniques.push(org.orgName);
    });
    uniques = [...new Set(uniques)];
    uniques.forEach((org) => {
      const ComplyReporter = new BuildTree(null, null, org, null, null);
      data.forEach((order) => {
        if (order.orgName === org) {
          ComplyReporter.parseAndAddLeaf(order.projectId, order.projectName, order.dates, order.scores, order.issues);
        }
      });
      ComplyReporter.calcSummaryScoresArray(timeline);
      ComplyReporter.calcIssueCountArray(timeline);

      crData.push(ComplyReporter);
    });

    // reorder children
    crData.forEach((org) => {
      let orderedChildren = reorderDataJson(org.children, 'path');
      org.children = orderedChildren;
    });

    if (writeFile(config, crData, log)) {
      resolve();
    }
  });
};
