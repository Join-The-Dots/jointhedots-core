import { createNewComponent } from "@jointhedots/core"

createNewComponent({
   "$id": "config:main-repo",
   "type": "jtd:github.service",
   "name": "github main repo",
   "icon": "fa:git",
   "settings": {
      "url": "https://github.com/jointhedots/jointhedots-app",
      "password": "******",
      "org": "jointhedots",
      "branch": "main",
   }
})

createNewComponent({
   "$id": "config:openAI",
   "name": "openAI",
   "type": "jtd:open-ai.service",
   "settings": {
      "accessKey": "qds5qgqzs-vdg-6hbrz5hr54bgvs544d",
   }
})

createNewComponent({
   "$id": "config:einstein",
   "name": "einstein",
   "type": "jtd:einstein-service-factory",
   "icon": "fa:link",
   "settings": {
      "accessKey": "qds5qgqzs-vdg-6hbrz5hr54bgvs544d",
   }
})

createNewComponent({
   "$id": "board:my-explorer",
   "type": "jtd:application.board.component",
   "title": "My Explorer",
   "description": "Add or remove entry points via the setup",
   "icon": "standard:custom_notification",
   "services": { "view.react": true },
   "toolings": [
      {
         "type": "servicePoint",
         "anchor": "status",
         "id": "SourceOrgs",
         "service": "storage"
      },
      {
         "type": "link",
         "anchor": "menu",
         "title": "Follow on linkedin",
         "icon": "bi:linkedin",
         "url": "https://www.linkedin.com/company/jointhedots-explorer/",
      },
      {
         "type": "link",
         "anchor": "menu",
         "title": "Documentation",
         "icon": "bi:info",
         "url": "https://jointhedots.github.io/documentation/",
      },
   ],
   "landingPage": {
      "view": "test.board.home",
   },
   "pages": {
      "Home": {
         "view": "test.board.home",
      },
      "1. Explore": {
         "pages": {
            "System Overview": { "view": "board.sfoverview" },
            "Object Manager": { "view": "sfe.objectmanager" },
            "Search": { "view": "sfe.search" },
            "Reports": {
               "view": {
                  "name": "sfe.soql",
                  "params": {
                     "title": "Search for a Report",
                     "hideExtendedOptions": true,
                     "initialTooling": false,
                     "initialQuery": "Select DeveloperName, FolderName, Description, LastRunDate from Report"
                  }
               }
            },
            "Dashboards": {
               "view": {
                  "name": "sfe.soql",
                  "params": {
                     "title": "Search for a Dashboard",
                     "hideExtendedOptions": true,
                     "initialTooling": false,
                     "initialQuery": "Select DeveloperName, FolderName, Description, CreatedBy.Name, LastModifiedDate from Dashboard order by LastModifiedDate desc"
                  }
               }
            }
         }
      }
   }
})
