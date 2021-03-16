FROM  adoptopenjdk/openjdk8
COPY ./build/libs/gitlabcicd-0.0.1-SNAPSHOT.jar ./
ENTRYPOINT ["java"]
CMD ["-jar", "/app.jar"