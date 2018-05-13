var React = require('react');

var NavBar = module.exports = React.createClass({
  logout: function() {
    window.location = '/auth/logout';
  },
  render: function() {
    return (
      <div className="slds-page-header" role="banner">
        <div className="slds-grid">

          {/* Banner */}
          <div className="slds-col slds-has-flexi-truncate">
            <div className="slds-media slds-media--center slds-no-space slds-grow">
              <div className="slds-media__figure">
                <img src="/assets/wolf-pawprint-32px.png" alt="Wolf pawprint logo"/>
              </div>
              <div className="slds-media__body">
                <p className="slds-page-header__title slds-truncate slds-align-middle" title="Salesforce React Integration">Hikers Trail Buddy</p>
                <p className="page-header__info">An application to help fellow trekkers and trailblazers when in need.</p>
              </div>
            </div>
          </div>

          {
            /*  Logged user name */
            this.props.user == null ? null :
              <div className="slds-col--padded slds-no-flex slds-grid slds-align-middle">
                Hi {this.props.user.display_name}
              </div>
          }

          {
            /*   Logout button */
            this.props.user == null ? null :
            <div className="slds-col slds-no-flex slds-grid">
              <button onClick={this.logout} className="slds-button slds-button--neutral">
                <svg aria-hidden="true" className="slds-button__icon--stateful slds-button__icon--left">
                  <use xlinkHref="/assets/icons/utility-sprite/svg/symbols.svg#logout"></use>
                </svg>
                Log out
              </button>
            </div>
          }

        </div>
      </div>
    );
  }
});
