require('../../../../node_modules/bootstrap/dist/css/bootstrap.min.css');
import * as React from 'react';
import styles from './Dmswebaspr.module.scss';
import type { IDmswebasprProps } from './IDmswebasprProps';
 
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ASPRDMSHome } from '../components/Homepage/ASPRHome';
import { Dashboard } from '../components/Dashboard/Dashboard';
import RequestPage  from '../components/Request/RequestPage';
import { ASPRDMSHomeArabic } from '../components/Homepage/ASPRHomeArabic';
import { spfi, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists/web";
import { setupSP } from '../services/dal/pnpget';
import { LibraryDocuments } from './DMSPage/DMSShowPage';
import { LanguageProvider } from '../components/Homepage/Languagecontext';
interface IDmsModuleState {
  defaultLibraryTitle: string | null;
}
 
export default class DmsModule extends React.Component<IDmswebasprProps, IDmsModuleState> {
  constructor(props: IDmswebasprProps) {
    super(props);
    this.state = {
      defaultLibraryTitle: null,
    };
  }
 
  public async componentDidMount() {
    const sp = spfi().using(SPFx(this.props.context));
    setupSP(this.props.context);
 
    // Libraries to exclude from showing up in default route
    const excludeLibraries = [
      "Documents",
      "Form Templates",
      "Site Assets",
      "Site Pages",
      "Style Library",
      "Images",
      "Site Collection Documents",
      "Site Collection Images",
      "Customized Reports",
      "Pages",
      "Banner", // 👈 exclude Banner
      "MicroFeed"
    ];
 
    try {
      const lists = await sp.web.lists
        .select("Title", "BaseTemplate")
        .filter("BaseTemplate eq 101 and Hidden eq false")(); // 101 = Document Library
 
      // Pick first non-excluded library
      const firstValidLib = lists.find(l => !excludeLibraries.includes(l.Title));
 
      if (firstValidLib) {
        this.setState({ defaultLibraryTitle: firstValidLib.Title });
      }
    } catch (error) {
      console.error("Error fetching libraries:", error);
    }
  }
 
  public render(): React.ReactElement<IDmswebasprProps> {
    const { defaultLibraryTitle } = this.state;
 
    return (
      <section className={styles.welcome}>
        <div>
          <LanguageProvider>
          <HashRouter>
            <Routes>
              {/* If no path, redirect to the first valid library */}
              {defaultLibraryTitle && (
                <Route
                  path="/"
                  element={<Navigate to={`/library`} replace />}
                />
              )}
 
              <Route
                path="/library"
                element={
                  <ASPRDMSHomeArabic
                    context={this.props.context}
                    currentSPContext={this.props.context} // pass same SPFx context
                  />
                }
              />
              <Route path="/library/:libraryName" element={<LibraryDocuments {...this.props} />} />
              <Route path="/dashboard" element={<Dashboard {...this.props} />} />
              <Route path="/Request" element={<RequestPage {...this.props} />} />
            </Routes>
          </HashRouter>
          </LanguageProvider>
        </div>
      </section>
    );
  }
}