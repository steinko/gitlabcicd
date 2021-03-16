FROM openjdk:15.0-slim
COPY ./build/libs/gitlabcicd-0.0.1-SNAPSHOT.jar ./
ENTRYPOINT ["java"]
CMD ["-jar", "/app.jar"