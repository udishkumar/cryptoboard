# CryptoBoard Application

This project is a web-based application that aggregates cryptocurrency-related news articles, performs sentiment analysis, and shows cryptocurrency growth data. The application is containerized using Docker.

## Prerequisites
- Docker should be installed on the system.
- The default port is `8082`. Make sure this port is available.

## Build and Run the Docker Container
Follow these steps to build and run the application in Docker:

1. **Clone the Repository**:
   - Clone the repository containing this project or extract the .zip file to a directory.

2. **Build the Docker Image**:
   - Open a terminal in the project directory and run the following command to build the Docker image:
     ```sh
     docker build -t cryptoboard-app .
     ```

3. **Run the Docker Container**:
   - After successfully building the image, use the following command to run a container:
     ```sh
     docker run -d -p 8082:8082 cryptoboard-app
     ```
   - The `-d` flag runs the container in detached mode.
   - The `-p 8082:8082` maps the container's port `8082` to the host's port `8082`. Make sure this port is available for use.

4. **Access the Application**:
   - Once the container is running, you can access the application in your browser by navigating to:
     ```
     http://localhost:8082
     ```
   - If you are running this on a cloud server, replace `localhost` with the server's public IP address:
     ```
     http://<server-ip>:8082
     ```

5. **Stopping the Docker Container**:
   - If you need to stop the running container, use the following command:
     ```sh
     docker ps
     ```
   - Note the `CONTAINER ID` of the running container, then run:
     ```sh
     docker stop <CONTAINER_ID>
     ```

6. **Troubleshooting**:
   - If you encounter an error or can't access the website:
     - Ensure Docker is running.
     - Ensure port `8082` is not blocked by a firewall.
     - Check the logs by using:
       ```sh
       docker logs <CONTAINER_ID>
       ```

## Application Description
The application aggregates cryptocurrency-related news from multiple sources, performs sentiment analysis, and visualizes cryptocurrency growth trends using a chart. It has the following features:
- Fetches and displays articles from Reddit, The Guardian, and NYTimes.
- Displays trending topics based on the articles.
- Shows a cryptocurrency growth chart, including projections.

## Environment Variables
The application uses environment variables to specify the API URL for the backend. This is defined in the `.env` file as:
