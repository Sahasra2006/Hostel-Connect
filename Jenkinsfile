pipeline {
    agent any

    environment {
        AWS_DEFAULT_REGION = 'us-east-1'
        DOCKER_CREDENTIALS_ID = 'dockerhub-creds'
        AWS_CREDENTIALS_ID = 'aws-creds'
        
        REGISTRY_USER = 'komalpreet1703'
        BACKEND_IMAGE_NAME = 'hostel-connect-backend'
        FRONTEND_IMAGE_NAME = 'hostel-connect-frontend'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('GitLeaks Secret Scan') {
            steps {
                echo '🔍 Initiating GitLeaks Secrets Scanning...'
                bat 'if not exist reports mkdir reports'
                bat 'gitleaks detect --source=. --verbose --redact --report-format=json --report-path=reports/gitleaks-report.json || exit 0'
            }
        }

        stage('Docker Build') {
            steps {
                echo '🐳 Packing Docker Container Images...'
                bat "docker build -t ${REGISTRY_USER}/${BACKEND_IMAGE_NAME}:${BUILD_NUMBER} ./backend"
                bat "docker build -t ${REGISTRY_USER}/${FRONTEND_IMAGE_NAME}:${BUILD_NUMBER} ./frontend"
            }
        }

        stage('Trivy Security Scan') {
            steps {
                echo '🛡 Running Trivy Vulnerability Scan...'
                bat 'if not exist reports mkdir reports'
                bat "trivy image --format json --output reports/trivy-backend-report.json --severity HIGH,CRITICAL --exit-code 0 ${REGISTRY_USER}/${BACKEND_IMAGE_NAME}:${BUILD_NUMBER}"
                bat "trivy image --format json --output reports/trivy-frontend-report.json --severity HIGH,CRITICAL --exit-code 0 ${REGISTRY_USER}/${FRONTEND_IMAGE_NAME}:${BUILD_NUMBER}"
            }
        }

        stage('Docker Registry Push') {
            steps {
                echo '🚀 Pushing containers to Docker Hub...'
                withCredentials([usernamePassword(credentialsId: "${DOCKER_CREDENTIALS_ID}", usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASSWORD')]) {
                    bat "echo %DOCKER_PASSWORD%| docker login -u %DOCKER_USER% --password-stdin"
                    bat "docker tag ${REGISTRY_USER}/${BACKEND_IMAGE_NAME}:${BUILD_NUMBER} ${REGISTRY_USER}/${BACKEND_IMAGE_NAME}:latest"
                    bat "docker tag ${REGISTRY_USER}/${FRONTEND_IMAGE_NAME}:${BUILD_NUMBER} ${REGISTRY_USER}/${FRONTEND_IMAGE_NAME}:latest"
                    bat "docker push ${REGISTRY_USER}/${BACKEND_IMAGE_NAME}:${BUILD_NUMBER}"
                    bat "docker push ${REGISTRY_USER}/${FRONTEND_IMAGE_NAME}:${BUILD_NUMBER}"
                    bat "docker push ${REGISTRY_USER}/${BACKEND_IMAGE_NAME}:latest"
                    bat "docker push ${REGISTRY_USER}/${FRONTEND_IMAGE_NAME}:latest"
                }
            }
        }

        stage('Kubernetes Deployment') {
            steps {
                echo '☸ Deploying to AWS EKS Cluster...'
                withCredentials([
                    [$class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: "${AWS_CREDENTIALS_ID}"]
                ]) {
                    bat "aws eks update-kubeconfig --region ${AWS_DEFAULT_REGION} --name hostelconnect-eks"
                    bat "kubectl apply -f k8s/namespace.yml"
                    bat "kubectl apply -f k8s/jenkins-config.yml"
                    bat "kubectl apply -f k8s/backend-rbac.yml"
                    bat "kubectl apply -f k8s/backend-deployment.yml"
                    bat "kubectl apply -f k8s/backend-service.yml"
                    bat "kubectl apply -f k8s/frontend-deployment.yml"
                    bat "kubectl apply -f k8s/frontend-service.yml"
                    bat "kubectl apply -f k8s/ingress.yml"

                    echo '⏳ Waiting for backend deployment rollout to complete...'
                    bat "kubectl rollout status deployment/backend -n hostel-connect --timeout=90s"

                    echo '📋 Copying vulnerability scanning reports into backend pods...'
                    powershell '''
                    $podNames = kubectl get pods -n hostel-connect -l app=backend -o jsonpath="{.items[*].metadata.name}"
                    if ($podNames) {
                        $pods = $podNames.Split(" ")
                        foreach ($pod in $pods) {
                            if ($pod.Trim()) {
                                Write-Output "Copying reports to pod: $pod"
                                kubectl exec -n hostel-connect $pod -- mkdir -p /app/reports
                                kubectl cp reports/trivy-backend-report.json hostel-connect/${pod}:/app/reports/trivy-backend-report.json
                                kubectl cp reports/trivy-frontend-report.json hostel-connect/${pod}:/app/reports/trivy-frontend-report.json
                                kubectl cp reports/gitleaks-report.json hostel-connect/${pod}:/app/reports/gitleaks-report.json
                            }
                        }
                    }
                    '''
                }
            }
        }
    }

    post {
        success {
            echo '🎉 Pipeline finished successfully! HostelConnect is fully deployed.'
        }
        failure {
            echo '❌ Pipeline failed. Review the console logs and scanners findings.'
        }
    }
}
