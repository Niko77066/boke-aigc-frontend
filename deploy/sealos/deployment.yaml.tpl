apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${APP_NAME}
  namespace: ${NAMESPACE}
  labels:
    app: ${APP_NAME}
spec:
  replicas: 1
  revisionHistoryLimit: 3
  selector:
    matchLabels:
      app: ${APP_NAME}
  template:
    metadata:
      labels:
        app: ${APP_NAME}
    spec:
      containers:
        - name: ${APP_NAME}
          image: ${IMAGE_REF}
          imagePullPolicy: Always
          ports:
            - containerPort: 80
              name: http
          env:
            - name: VITE_API_BASE_URL
              value: "${API_BASE_URL}"
            - name: VITE_CAPCUT_API_BASE_URL
              value: "${CAPCUT_API_BASE_URL}"
            - name: VITE_CAPCUT_API_KEY
              value: "${CAPCUT_API_KEY}"
            - name: PIPELINE_AUTHORIZATION
              value: "${PIPELINE_AUTHORIZATION}"
          readinessProbe:
            httpGet:
              path: /healthz
              port: http
            initialDelaySeconds: 3
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /healthz
              port: http
            initialDelaySeconds: 10
            periodSeconds: 20
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 512Mi
