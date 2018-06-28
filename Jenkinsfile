node {
  env.NVM_DIR=""

  def nodeVersion = "8.11.3"

  stage('Checkout'){
    checkout scm
    git branch: "${env.BRANCH_NAME}"
  }

  stage('Fetch dependencies'){
    sh """#!/bin/bash
      source ~/.nvm/nvm.sh
      nvm install ${nodeVersion}
      nvm use ${nodeVersion}
      npm install
    """
  }

  stage('Running Tests') {
    sh """#!/bin/bash -e
      source ~/.nvm/nvm.sh
      nvm use ${nodeVersion}
      npm run test
    """
    publishHTML(target: [reportDir: 'coverage/lcov-report/', reportFiles: 'index.html', reportName: 'Code Coverage'])
  }
}
