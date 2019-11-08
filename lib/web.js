import React from 'react';
import ReactDOM from 'react-dom';
import { HashRouter as Router, Route, Switch, Link } from 'react-router-dom';

const _scores = require('../reports/report.json');
const scores = _scores.slice(0, -1);
const mArray = scores[0].dates || scores[0].children[0].dates;

let key = 100;

const getUniqueString = () => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('');
  const length = 10;
  let str = '';
  for (let i = 0; i < length; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
};

// allows us to pass in props to components from the React Router
const renderMergedProps = (component, ...rest) => {
  const finalProps = Object.assign({}, ...rest);
  return (
    React.createElement(component, finalProps)
  );
};

// stateless component that renders the toggle button
const ToggleRowsButton = (props) => {
  return (
    <button type="button" className="btn btn-primary toggleAllRows" onClick={event => props.toggleExpanded()} aria-pressed={props.expanded ? 'true' : 'false'}>
      {
        props.expanded
          ? 'Collapse all details'
          : 'Show all details'
      }
    </button>
  );
};

// returns an updated React component with props; used in React Router
const HandledRoute = ({ component, ...rest }) => {
  return (
    <Route {...rest} render={routeProps => {
      return renderMergedProps(component, routeProps, rest);
    }} />
  );
};

// the new stateful component; state is necessary for the toggle button
class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isExpanded: false
    };

    this.toggleExpanded = this.toggleExpanded.bind(this);
  }

  // defined function that we pass as props so child components can access it
  toggleExpanded() {
    this.setState({
      isExpanded: !this.state.isExpanded
    });
  }

  render() {
    return (
      <div>
        <br/><br/>
        <h1>Accessibility Compliance</h1><br />

        <div className="content">
          <Switch>
            <HandledRoute exact path='/' component={Home} toggleExpanded={this.toggleExpanded} expanded={this.state.isExpanded} />
            <HandledRoute path='/s/:opDiv' component={OpDiv} toggleExpanded={this.toggleExpanded} expanded={this.state.isExpanded} />
          </Switch>
        </div>
      </div>
    );
  }
}

// main display (not yet clicked into opdiv)
const Home = (props) => {
  return (
    <div>
      <h2>Top-level groups</h2><br/>
      <div className="row">
        <div className="col">
          <ToggleRowsButton toggleExpanded={props.toggleExpanded} expanded={props.expanded} />
        </div>
        <div className="col">
          <a className="btn btn-secondary float-right" data-toggle="collapse" href="#collapseScores" role="button" aria-expanded="false" aria-controls="collapseScores">
            Scores explained
          </a>
        </div>
      </div>
      <div className="collapse" id="collapseScores">
        <div className="card card-body" style={{padding:'1em',marginBottom:'2em'}}>
        <p>Higher numbers are good, lower numbers are bad</p>
        <ul>
          <li><strong>Issues</strong> are categorized as Critical, Serious, Moderate or Minor.</li>
          <li><strong>Pages</strong> are categorized as Critical, Serious, Fair or Good based on the "worst" issue on the page.  That is, if a page has one Critical issue, the page is Critical; one Serious issue, the page is Serious; one Moderate issue, the page is Fair; and if a page only contains Minor issues, it is Good.</li>
          <li>The <strong>Project Score</strong> is based on Page categories and is calculated according the following formula:
            <ul>
              <li>(0.4*p2 + 0.8*p1 + p0)/ TP</li>
              <li>where:</li>
              <li>p2 = number of Serious pages</li>
              <li>p1 = number of Fair pages</li>
              <li>p0 = number of Good pages</li>
              <li>TP=Total pages</li>
            </ul>
          </li>
          <li>In other words, WorldSpace Comply gives 40% for a page that has Serious issues, 80% for a page that has Moderate issues, 100% for pages with only Minor issues, and 0% for pages having Critical issues.  (Since WorldSpace Comply gives 0% for pages with critical there is no p3 in the formula.)</li>
          <li>The System dashboard scores are an average of all organizations scores. The organization score itself is the average of all projects under that organization.  As straightforward averages, the scores are not weighted by projects, issues, or other criteria.</li>
        </ul>


        </div>
      </div>
      <LbTable months={mArray} opDiv={scores} expanded={props.expanded} />
    </div>
  );
};

// not main display (having clicked into an opdiv)
const OpDiv = (props) => {
  const opDiv = props.match.params.opDiv;
  const opDivNode = findNode(scores, opDiv);
  if (!opDivNode) {
    return (
      <div>
        <h2>Internal error: Could not find page for {opDiv}</h2>
      </div>
    );
  }
  return (
    <div>
      <h2>Page for {opDiv}</h2>
      <ToggleRowsButton toggleExpanded={props.toggleExpanded} expanded={props.expanded} />
      <p><a href="index.html">Back to top-level</a></p>
      <LbTable months={mArray} opDiv={opDivNode.children} expanded={props.expanded} />
    </div>
  );
};

// stateful component for each row of data
class LbDataRow extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isExpanded: this.props.expanded ? this.props.expanded : false,
      org: this.props.orgData
    };

    this.toggleExpanded = this.toggleExpanded.bind(this);
  }

  toggleExpanded() {
    this.setState({
      isExpanded: !this.state.isExpanded
    });
  }

  render() {
    let path;
    let id;
    if (this.state.org.children.length > 0) {
      path = `/s/${this.state.org.path}`;
      id = this.state.org.id;
    } else {
      path = null;
      id = this.state.org.id;
    }
    let scoreArray = [];
    for (let score of this.state.org.scores) {
      scoreArray.push(<LbCell key={key} content={score} />);
      key++;
    }
    return (
      <div role="row">
        <div className="has-flex">
          <LbRowHeadingCell content={this.state.org.name} projectId={id} link={path} expanded={this.state.isExpanded} toggleExpanded={this.toggleExpanded} />{scoreArray}
        </div>
        <ExpandedTableData org={this.state.org} path={this.state.org.path} expanded={this.state.isExpanded} />
      </div>
    );
  }
}

// stateless component for rendering the additional details data
const ExpandedTableData = (props) => {
  const { org, expanded } = props;

  const headers = [];
  const data = [];

  // react/jsx requires nested children, but that doesn't work here
  // so we need to push them individually. it's dumb.
  for (let i = 0; i < mArray.length; i++) {
    headers.push(
      <div role="gridcell" className="data column-header text-right" key={key++}>
        <abbr title="Violations" aria-hidden="true">Viol.</abbr>
        <span className="visually-hidden">Violations</span>
      </div>
    );
    headers.push(
      <div role="gridcell" className="data column-header text-right" key={key++}>Pages</div>
    );
  }

  const getViolationsPages = (issueGroup, index, unique) => {
    const data = [];

    // same here with the nested children
    for (let i = 0; i < mArray.length; i++) {
      data.push(
        <div role="gridcell" className="data is-flexed text-right" aria-describedby={`date-${i} row-${index}-${unique}`} key={key++}>
          {org.issues[i][issueGroup] ?
            org.issues[i][issueGroup].violations : 0}
          <span className="visually-hidden">
            {`${issueGroup} violations on ${mArray[i]}`}
          </span>
        </div>
      );
      data.push(
        <div role="gridcell" className="data is-flexed text-right" aria-describedby={`date-${i} row-${index}-${unique}`} key={key++}>
          <span className="visually-hidden">across</span>
          {org.issues[i][issueGroup] ?
            org.issues[i][issueGroup].pages : 0}
          <span className="visually-hidden">pages</span>
        </div>
      );
    }

    return data;
  };

  // get the total/max number of violations; some months may be lower, but we want to show everything
  const totalKeys = [];
  org.issues.forEach(issues => {
    Object.keys(issues).forEach(issue => {
      if (totalKeys.includes(issue)) {
        return;
      }
      totalKeys.push(issue);
    });
  });

  // makes a new row for each issue type
  totalKeys.forEach((value, index) => {
    const unique = getUniqueString();

    data.push(
      <div role="row" className="has-flex" key={index}>
        <div role="rowheader" className="is-not-flexed text-right" id={`row-${index}-${unique}`}>{value}</div>
        {getViolationsPages(value, index, unique)}
      </div>
    );
  });

  return (
    <div role="grid" className={expanded ? 'details is-expanded' : 'details'} aria-label={'Details for ' + org.name}>
      <div role="row" className="has-flex">
        <div role="columnheader" className="is-not-flexed text-right">Issue Group</div>
        {headers}
      </div>
      {data}
    </div>
  );
};

const hasChild = (node, name) => {
  let result = false;
  for (let i = 0; i < node.children.length; i++) {
    if (node.children[i].name === name) {
      result = node.children[i];
      break;
    }
  }
  return result;
};

// depth-first recursive object search
const findNode = (scores, opDiv, found = []) => {
  for (let org in scores) {
    if (scores[org].path === opDiv) {
      found.push(scores[org]);
      return found[0];
    }
    if (typeof scores[org] === 'object') {
      findNode(scores[org].children, opDiv, found);
    }
  }
  return found[0];
};

// stateless component for each table cell
const LbCell = (props) => {
  const { content } = props;

  return (
    <div role="gridcell" className="is-flexed text-right">{isNaN(content) ? content : `${content.toFixed(2)}%`}</div>
  );
};

// stateless component for each row heading cell; used for opdivs
// displays a link if the group has children, or just text if not
const LbRowHeadingCell = (props) => {
  const { content, link } = props;
  if (link != null) {
    return (
      <div role="rowheader" className="row-header is-not-flexed">
        <Link to={link}>{content}</Link>
        <button type="button" className={'btn btn-secondary pull-right ' + props.expanded} onClick={event => props.toggleExpanded()} aria-label={props.expanded ? 'Hide detailed data' : 'Show detailed data'} aria-pressed={props.expanded ? 'true' : 'false'}>{
          props.expanded
            ? <span className="icon fa fa-minus" aria-hidden="true"></span>
            : <span className="icon fa fa-plus" aria-hidden="true"></span>
        }</button>
      </div>
    );
  } else {
    return (
      <div role="rowheader" className="row-header is-not-flexed">
        {content}
        <button type="button" className={'btn btn-secondary pull-right ' + props.expanded} onClick={event => props.toggleExpanded()} aria-label={props.expanded ? 'Hide detailed data' : 'Show detailed data'} aria-pressed={props.expanded ? 'true' : 'false'}>{
          props.expanded
            ? <span className="icon fa fa-minus" aria-hidden="true"></span>
            : <span className="icon fa fa-plus" aria-hidden="true"></span>
        }</button>
      </div>
    );
  }
};

// stateless component to display a column header
const LbColHeadingCell = (props) => {
  const { content, index } = props;
  return (
    <div role="columnheader" className="is-flexed text-right" id={`date-${index}`}>{content}</div>
  );
};

// the leaderboard table component
const LbTable = (props) => {
  const { months, opDiv, expanded } = props;
  let moHeading = [];
  let tableRows = [];

  for (let i = 0; i < months.length; i++) {
    moHeading.push(<LbColHeadingCell key={i} content={months[i]} index={i} />);
  }

  for (let org of opDiv) {
    tableRows.push(<LbDataRow key={key} orgData={org} expanded={expanded} />);
    key++;
  }

  return (
    <div role="grid" className="table table-bordered table-sm table-striped">
      <div role="row" className="has-flex header-row" id="main-header-row">
        <div role="columnheader" className="is-not-flexed">Group</div>
        {moHeading}
      </div>
      {tableRows}
    </div>
  );
};

// render in the DOM
ReactDOM.render(<Router><App /></Router>, document.querySelector('#page-container'));
